import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from 'idb'
import {
  buildSnapshotRecord,
  nextSnapshotSlot,
  pushLogEntry,
  SNAPSHOT_MIN_INTERVAL_MS,
  TRASH_TTL_MS,
  upsertSnapshotRecord,
  type LogKind,
  type SnapshotRecord,
  type TrashReason,
  type VaultLogEntry
} from '../engine/vault'
import { isChildProfile, type ChildProfile } from '../state/profile'

const DATABASE_NAME = 'stolbik-local'
const DATABASE_VERSION = 1
const MAX_BACKUPS = 30

export interface TrashEntry {
  id: string
  profileId: string
  deletedAt: number
  profile: ChildProfile
  reason?: TrashReason
}

interface MetaEntry {
  key: string
  value: unknown
}

interface StolbikDatabase extends DBSchema {
  profiles: {
    key: string
    value: ChildProfile
  }
  meta: {
    key: string
    value: MetaEntry
  }
  trash: {
    key: string
    value: TrashEntry
  }
}

let databasePromise: Promise<IDBPDatabase<StolbikDatabase>> | null = null

function getDatabase(): Promise<IDBPDatabase<StolbikDatabase>> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB недоступна в этом браузере.'))
  if (!databasePromise) {
    databasePromise = openDB<StolbikDatabase>(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('profiles')) database.createObjectStore('profiles', { keyPath: 'id' })
        if (!database.objectStoreNames.contains('meta')) database.createObjectStore('meta', { keyPath: 'key' })
        if (!database.objectStoreNames.contains('trash')) database.createObjectStore('trash', { keyPath: 'id' })
      }
    }).catch((error: unknown) => {
      databasePromise = null
      throw error
    })
  }
  return databasePromise
}

export interface LoadedData {
  profiles: ChildProfile[]
  activeProfileId: string | null
}

export interface VaultData {
  trash: TrashEntry[]
  snapshots: SnapshotRecord[]
  log: VaultLogEntry[]
  lastExportAt: number | null
  lastWriteAt: number | null
  persisted: boolean | null
}

function parseSnapshots(raw: unknown): SnapshotRecord[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is SnapshotRecord => {
    const candidate = item as Partial<SnapshotRecord> | null
    return (
      !!candidate &&
      typeof candidate.slot === 'number' &&
      typeof candidate.at === 'number' &&
      Array.isArray(candidate.profiles) &&
      candidate.profiles.every(isChildProfile)
    )
  })
}

function parseLog(raw: unknown): VaultLogEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is VaultLogEntry => {
    const candidate = item as Partial<VaultLogEntry> | null
    return !!candidate && typeof candidate.at === 'number' && typeof candidate.kind === 'string'
  })
}

export async function loadLocalData(): Promise<LoadedData> {
  const database = await getDatabase()
  const [profiles, activeEntry, logEntry] = await Promise.all([
    database.getAll('profiles'),
    database.get('meta', 'activeProfileId'),
    database.get('meta', 'vaultLog')
  ])
  const safeProfiles = profiles.filter(isChildProfile)
  const activeProfileId = typeof activeEntry?.value === 'string' ? activeEntry.value : null
  const nextLog = pushLogEntry(parseLog(logEntry?.value), 'hydrate-ok', `профилей: ${safeProfiles.length}`)
  await database.put('meta', { key: 'vaultLog', value: nextLog }).catch(() => undefined)
  return {
    profiles: safeProfiles.sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    activeProfileId: safeProfiles.some((profile) => profile.id === activeProfileId) ? activeProfileId : null
  }
}

async function addBackup<TxStores extends ArrayLike<'profiles' | 'trash' | 'meta'>>(
  tx: IDBPTransaction<StolbikDatabase, TxStores, 'readwrite'>,
  profile: ChildProfile,
  reason: TrashReason = 'backup'
): Promise<void> {
  const trash = tx.objectStore('trash')
  const all = await trash.getAll()
  const now = Date.now()
  const suffix = Math.random().toString(36).slice(2, 7)
  await trash.put({
    id: `${profile.id}:${now}:${suffix}`,
    profileId: profile.id,
    deletedAt: now,
    profile,
    reason
  })
  const expired = all.filter((entry) => now - entry.deletedAt > TRASH_TTL_MS)
  for (const old of expired) await trash.delete(old.id)
  const alive = all.filter((entry) => now - entry.deletedAt <= TRASH_TTL_MS)
  if (alive.length >= MAX_BACKUPS) {
    alive.sort((left, right) => left.deletedAt - right.deletedAt)
    for (const oldEntry of alive.slice(0, alive.length - MAX_BACKUPS + 1)) await trash.delete(oldEntry.id)
  }
}

export async function saveProfile(profile: ChildProfile, reason: TrashReason = 'backup'): Promise<void> {
  const database = await getDatabase()
  const tx = database.transaction(['profiles', 'trash', 'meta'], 'readwrite')
  const store = tx.objectStore('profiles')
  const meta = tx.objectStore('meta')
  const previous = await store.get(profile.id)
  if (previous) await addBackup(tx, previous, reason)
  await store.put(profile)
  const now = Date.now()
  await meta.put({ key: 'lastWriteAt', value: now })

  // Автоматический снимок состояния (раз в 30 минут или при сбросе)
  const allProfiles = (await store.getAll()).filter(isChildProfile)
  const activeEntry = await meta.get('activeProfileId')
  const activeId = typeof activeEntry?.value === 'string' ? activeEntry.value : profile.id
  const snapshotsEntry = await meta.get('snapshots')
  const snapshots = parseSnapshots(snapshotsEntry?.value)
  const newestAt = snapshots.length ? Math.max(...snapshots.map((s) => s.at)) : null
  const isDestructiveReset = reason === 'reset'
  const shouldSnapshot =
    allProfiles.length > 0 &&
    (isDestructiveReset || newestAt === null || now - newestAt >= SNAPSHOT_MIN_INTERVAL_MS)
  if (shouldSnapshot) {
    const slot = nextSnapshotSlot(snapshots)
    const record = buildSnapshotRecord(slot, allProfiles, activeId, now)
    const nextSnapshots = upsertSnapshotRecord(snapshots, record)
    await meta.put({ key: 'snapshots', value: nextSnapshots })
  }
  if (reason === 'reset') {
    const logEntry = await meta.get('vaultLog')
    const nextLog = pushLogEntry(parseLog(logEntry?.value), 'profile-reset', profile.name, now)
    await meta.put({ key: 'vaultLog', value: nextLog })
  }
  await tx.done
  broadcastSync()
}

export async function setActiveProfileId(profileId: string | null): Promise<void> {
  const database = await getDatabase()
  if (profileId === null) {
    await database.delete('meta', 'activeProfileId')
  } else {
    await database.put('meta', { key: 'activeProfileId', value: profileId })
  }
  broadcastSync()
}

export async function archiveProfile(profileId: string, reason: TrashReason = 'delete'): Promise<void> {
  const database = await getDatabase()
  const tx = database.transaction(['profiles', 'trash', 'meta'], 'readwrite')
  const store = tx.objectStore('profiles')
  const meta = tx.objectStore('meta')
  const allBefore = (await store.getAll()).filter(isChildProfile)
  const activeEntry = await meta.get('activeProfileId')
  const activeId = typeof activeEntry?.value === 'string' ? activeEntry.value : null
  const now = Date.now()

  if (allBefore.length > 0) {
    const snapshotsEntry = await meta.get('snapshots')
    const snapshots = parseSnapshots(snapshotsEntry?.value)
    const slot = nextSnapshotSlot(snapshots)
    const record = buildSnapshotRecord(slot, allBefore, activeId, now)
    await meta.put({ key: 'snapshots', value: upsertSnapshotRecord(snapshots, record) })
  }

  const profile = await store.get(profileId)
  if (profile) {
    await addBackup(tx, profile, reason)
    const logEntry = await meta.get('vaultLog')
    const nextLog = pushLogEntry(parseLog(logEntry?.value), 'profile-delete', profile.name, now)
    await meta.put({ key: 'vaultLog', value: nextLog })
  }
  await store.delete(profileId)
  if (activeId === profileId) {
    const remaining = allBefore.filter((p) => p.id !== profileId)
    if (remaining[0]) {
      await meta.put({ key: 'activeProfileId', value: remaining[0].id })
    } else {
      await meta.delete('meta' === 'meta' ? 'activeProfileId' : 'activeProfileId')
    }
  }
  await meta.put({ key: 'lastWriteAt', value: now })
  await tx.done
  broadcastSync()
}

export async function getBackupCount(): Promise<number> {
  const database = await getDatabase()
  return await database.count('trash')
}

export async function checkPersistentStorage(): Promise<boolean | null> {
  if (typeof navigator === 'undefined' || !('storage' in navigator)) return null
  try {
    const storage = navigator.storage as StorageManager & { persisted?: () => Promise<boolean> }
    if (typeof storage.persisted !== 'function') return null
    return await storage.persisted()
  } catch {
    return null
  }
}

export async function requestPersistentStorage(force = false): Promise<boolean | null> {
  if (typeof navigator === 'undefined' || !('storage' in navigator)) return null
  try {
    const database = await getDatabase()
    if (!force) {
      const existing = await database.get('meta', 'persistentStorageRequested')
      if (existing?.value === true) return await checkPersistentStorage()
    }
    const storage = navigator.storage as StorageManager & { persist?: () => Promise<boolean> }
    if (typeof storage.persist !== 'function') return null
    const granted = await storage.persist()
    await database.put('meta', { key: 'persistentStorageRequested', value: true })
    await appendVaultLog(granted ? 'persist-on' : 'persist-off')
    return granted
  } catch {
    return null
  }
}

export async function loadVaultData(): Promise<VaultData> {
  const database = await getDatabase()
  const [trashAll, snapshotsEntry, logEntry, exportEntry, writeEntry, persisted] = await Promise.all([
    database.getAll('trash'),
    database.get('meta', 'snapshots'),
    database.get('meta', 'vaultLog'),
    database.get('meta', 'lastExportAt'),
    database.get('meta', 'lastWriteAt'),
    checkPersistentStorage()
  ])
  const safeTrash = trashAll
    .filter((entry) => entry && isChildProfile(entry.profile))
    .sort((a, b) => b.deletedAt - a.deletedAt)

  return {
    trash: safeTrash,
    snapshots: parseSnapshots(snapshotsEntry?.value).sort((a, b) => b.at - a.at),
    log: parseLog(logEntry?.value),
    lastExportAt: typeof exportEntry?.value === 'number' ? exportEntry.value : null,
    lastWriteAt: typeof writeEntry?.value === 'number' ? writeEntry.value : null,
    persisted
  }
}

export async function appendVaultLog(kind: LogKind, note?: string): Promise<VaultLogEntry[]> {
  const database = await getDatabase()
  const entry = await database.get('meta', 'vaultLog')
  const next = pushLogEntry(parseLog(entry?.value), kind, note)
  await database.put('meta', { key: 'vaultLog', value: next })
  return next
}

export async function recordExportTimestamp(note?: string): Promise<number> {
  const database = await getDatabase()
  const now = Date.now()
  await database.put('meta', { key: 'lastExportAt', value: now })
  await appendVaultLog('export', note)
  return now
}

export async function createSnapshot(note?: string): Promise<SnapshotRecord[]> {
  const database = await getDatabase()
  const tx = database.transaction(['profiles', 'meta'], 'readwrite')
  const profiles = (await tx.objectStore('profiles').getAll()).filter(isChildProfile)
  const meta = tx.objectStore('meta')
  const activeEntry = await meta.get('activeProfileId')
  const activeId = typeof activeEntry?.value === 'string' ? activeEntry.value : null
  const snapshotsEntry = await meta.get('snapshots')
  const snapshots = parseSnapshots(snapshotsEntry?.value)
  const now = Date.now()
  const slot = nextSnapshotSlot(snapshots)
  const record = buildSnapshotRecord(slot, profiles, activeId, now)
  const nextSnapshots = upsertSnapshotRecord(snapshots, record)
  await meta.put({ key: 'snapshots', value: nextSnapshots })
  const logEntry = await meta.get('vaultLog')
  await meta.put({
    key: 'vaultLog',
    value: pushLogEntry(parseLog(logEntry?.value), 'snapshot', note ?? `копия #${slot}`, now, 0)
  })
  await tx.done
  return nextSnapshots.sort((a, b) => b.at - a.at)
}

export async function restoreSnapshotSlot(slot: number): Promise<LoadedData | null> {
  const database = await getDatabase()
  const tx = database.transaction(['profiles', 'trash', 'meta'], 'readwrite')
  const store = tx.objectStore('profiles')
  const meta = tx.objectStore('meta')
  const snapshotsEntry = await meta.get('snapshots')
  const snapshots = parseSnapshots(snapshotsEntry?.value)
  const target = snapshots.find((s) => s.slot === slot)
  if (!target) return null

  const currentProfiles = (await store.getAll()).filter(isChildProfile)
  for (const current of currentProfiles) {
    await addBackup(tx, current, 'backup')
  }
  await store.clear()
  for (const restored of target.profiles) {
    if (isChildProfile(restored)) await store.put(restored)
  }
  const nextActiveId =
    target.activeProfileId && target.profiles.some((p) => p.id === target.activeProfileId)
      ? target.activeProfileId
      : target.profiles[0]?.id ?? null
  if (nextActiveId) {
    await meta.put({ key: 'activeProfileId', value: nextActiveId })
  } else {
    await meta.delete('activeProfileId')
  }
  const now = Date.now()
  await meta.put({ key: 'lastWriteAt', value: now })
  const logEntry = await meta.get('vaultLog')
  await meta.put({
    key: 'vaultLog',
    value: pushLogEntry(parseLog(logEntry?.value), 'restore-snapshot', `слот #${slot}`, now, 0)
  })
  await tx.done
  broadcastSync()
  return {
    profiles: target.profiles.filter(isChildProfile),
    activeProfileId: nextActiveId
  }
}

export async function restoreTrashEntry(entryId: string): Promise<ChildProfile | null> {
  const database = await getDatabase()
  const tx = database.transaction(['profiles', 'trash', 'meta'], 'readwrite')
  const trash = tx.objectStore('trash')
  const store = tx.objectStore('profiles')
  const meta = tx.objectStore('meta')
  const entry = await trash.get(entryId)
  if (!entry || !isChildProfile(entry.profile)) return null

  const existing = await store.get(entry.profile.id)
  if (existing) await addBackup(tx, existing, 'backup')
  await store.put(entry.profile)
  await trash.delete(entryId)
  const now = Date.now()
  await meta.put({ key: 'lastWriteAt', value: now })
  const logEntry = await meta.get('vaultLog')
  await meta.put({
    key: 'vaultLog',
    value: pushLogEntry(parseLog(logEntry?.value), 'profile-restore', entry.profile.name, now, 0)
  })
  await tx.done
  broadcastSync()
  return entry.profile
}

export async function deleteTrashEntry(entryId: string): Promise<void> {
  const database = await getDatabase()
  await database.delete('trash', entryId)
}

export async function replaceAllProfiles(
  profiles: ChildProfile[],
  activeProfileId: string | null
): Promise<void> {
  const safeProfiles = profiles.filter(isChildProfile)
  if (safeProfiles.length === 0) throw new Error('В загруженном файле не найдено корректных профилей Столбика.')
  const database = await getDatabase()
  const tx = database.transaction(['profiles', 'trash', 'meta'], 'readwrite')
  const store = tx.objectStore('profiles')
  const meta = tx.objectStore('meta')
  const now = Date.now()

  const previous = (await store.getAll()).filter(isChildProfile)
  if (previous.length > 0) {
    const activeEntry = await meta.get('activeProfileId')
    const prevActiveId = typeof activeEntry?.value === 'string' ? activeEntry.value : null
    const snapshotsEntry = await meta.get('snapshots')
    const snapshots = parseSnapshots(snapshotsEntry?.value)
    const slot = nextSnapshotSlot(snapshots)
    const record = buildSnapshotRecord(slot, previous, prevActiveId, now)
    await meta.put({ key: 'snapshots', value: upsertSnapshotRecord(snapshots, record) })
    for (const prof of previous) {
      await addBackup(tx, prof, 'import')
    }
  }

  await store.clear()
  for (const prof of safeProfiles) {
    await store.put(prof)
  }
  const resolvedActive =
    activeProfileId && safeProfiles.some((p) => p.id === activeProfileId)
      ? activeProfileId
      : safeProfiles[0]!.id
  await meta.put({ key: 'activeProfileId', value: resolvedActive })
  await meta.put({ key: 'lastWriteAt', value: now })
  const logEntry = await meta.get('vaultLog')
  await meta.put({
    key: 'vaultLog',
    value: pushLogEntry(parseLog(logEntry?.value), 'import', `профилей: ${safeProfiles.length}`, now, 0)
  })
  await tx.done
  broadcastSync()
}

// ── Синхронизация между открытыми вкладками / ярлыком на экране ──────────────

const CHANNEL_NAME = 'stolbik-sync'
const CLIENT_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
let syncChannel: BroadcastChannel | null = null

function getSyncChannel(): BroadcastChannel | null {
  if (syncChannel) return syncChannel
  try {
    if (typeof BroadcastChannel === 'undefined') return null
    syncChannel = new BroadcastChannel(CHANNEL_NAME)
  } catch {
    syncChannel = null
  }
  return syncChannel
}

export function broadcastSync(): void {
  try {
    getSyncChannel()?.postMessage({ type: 'changed', from: CLIENT_ID })
  } catch {
    /* ignore */
  }
}

export function onExternalSync(callback: () => void): () => void {
  const channel = getSyncChannel()
  if (!channel) return () => undefined
  const onMessage = (event: MessageEvent) => {
    const data = event.data as { type?: string; from?: string } | undefined
    if (data?.from === CLIENT_ID || data?.type !== 'changed') return
    callback()
  }
  channel.addEventListener('message', onMessage)
  return () => channel.removeEventListener('message', onMessage)
}

export async function resetLocalDatabaseForTests(): Promise<void> {
  if (databasePromise) {
    try {
      const database = await databasePromise
      database.close()
    } catch {
      // The test may be resetting a database after an earlier open failure.
    }
  }
  databasePromise = null
  if (typeof indexedDB === 'undefined') return
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('Не удалось удалить тестовую базу данных.'))
    request.onblocked = () => reject(new Error('Тестовая база данных заблокирована.'))
  })
}
