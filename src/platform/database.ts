import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from 'idb'
import { isChildProfile, type ChildProfile } from '../state/profile'

const DATABASE_NAME = 'stolbik-local'
const DATABASE_VERSION = 1
const MAX_BACKUPS = 30

interface TrashEntry {
  id: string
  profileId: string
  deletedAt: number
  profile: ChildProfile
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

export async function loadLocalData(): Promise<LoadedData> {
  const database = await getDatabase()
  const [profiles, activeEntry] = await Promise.all([
    database.getAll('profiles'),
    database.get('meta', 'activeProfileId')
  ])
  const safeProfiles = profiles.filter(isChildProfile)
  const activeProfileId = typeof activeEntry?.value === 'string' ? activeEntry.value : null
  return {
    profiles: safeProfiles.sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    activeProfileId: safeProfiles.some((profile) => profile.id === activeProfileId) ? activeProfileId : null
  }
}

async function addBackup<TxStores extends ArrayLike<'profiles' | 'trash' | 'meta'>>(tx: IDBPTransaction<StolbikDatabase, TxStores, 'readwrite'>, profile: ChildProfile): Promise<void> {
  const trash = tx.objectStore('trash')
  const all = await trash.getAll()
  const suffix = Math.random().toString(36).slice(2, 7)
  await trash.put({
    id: `${profile.id}:${Date.now()}:${suffix}`,
    profileId: profile.id,
    deletedAt: Date.now(),
    profile
  })
  if (all.length >= MAX_BACKUPS) {
    all.sort((left, right) => left.deletedAt - right.deletedAt)
    for (const oldEntry of all.slice(0, all.length - MAX_BACKUPS + 1)) await trash.delete(oldEntry.id)
  }
}

export async function saveProfile(profile: ChildProfile): Promise<void> {
  const database = await getDatabase()
  const tx = database.transaction(['profiles', 'trash'], 'readwrite')
  const store = tx.objectStore('profiles')
  const previous = await store.get(profile.id)
  if (previous) await addBackup(tx, previous)
  await store.put(profile)
  await tx.done
}

export async function setActiveProfileId(profileId: string | null): Promise<void> {
  const database = await getDatabase()
  if (profileId === null) {
    await database.delete('meta', 'activeProfileId')
  } else {
    await database.put('meta', { key: 'activeProfileId', value: profileId })
  }
}

export async function archiveProfile(profileId: string): Promise<void> {
  const database = await getDatabase()
  const tx = database.transaction(['profiles', 'trash', 'meta'], 'readwrite')
  const store = tx.objectStore('profiles')
  const profile = await store.get(profileId)
  if (profile) await addBackup(tx, profile)
  await store.delete(profileId)
  const active = await tx.objectStore('meta').get('activeProfileId')
  if (active?.value === profileId) await tx.objectStore('meta').delete('activeProfileId')
  await tx.done
}

export async function getBackupCount(): Promise<number> {
  const database = await getDatabase()
  return (await database.count('trash'))
}

export async function requestPersistentStorage(): Promise<boolean | null> {
  if (typeof navigator === 'undefined' || !('storage' in navigator)) return null
  try {
    const database = await getDatabase()
    const existing = await database.get('meta', 'persistentStorageRequested')
    if (existing?.value === true) return null
    const storage = navigator.storage as StorageManager & { persist?: () => Promise<boolean> }
    if (typeof storage.persist !== 'function') return null
    const granted = await storage.persist()
    await database.put('meta', { key: 'persistentStorageRequested', value: true })
    return granted
  } catch {
    return null
  }
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
