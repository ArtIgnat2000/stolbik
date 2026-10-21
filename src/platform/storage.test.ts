import { beforeEach, describe, expect, it } from 'vitest'
import { createProfileBackup, parseBackupPayload } from './backup'
import {
  archiveProfile,
  createSnapshot,
  deleteTrashEntry,
  getBackupCount,
  loadLocalData,
  loadVaultData,
  replaceAllProfiles,
  resetLocalDatabaseForTests,
  restoreSnapshotSlot,
  restoreTrashEntry,
  saveProfile,
  setActiveProfileId
} from './database'
import { createProfile } from '../state/profile'

beforeEach(async () => {
  await resetLocalDatabaseForTests()
})

describe('локальное хранилище профилей и сейф прогресса', () => {
  it('сохраняет прогресс и создаёт ограниченную корзину предыдущих версий', async () => {
    const profile = createProfile('Аня')
    await saveProfile(profile)
    await setActiveProfileId(profile.id)

    const progressed = {
      ...profile,
      progress: { ...profile.progress, totalSolved: 7, totalErrors: 2 }
    }
    await saveProfile(progressed)

    const loaded = await loadLocalData()
    expect(loaded.profiles).toHaveLength(1)
    expect(loaded.profiles[0]?.progress.totalSolved).toBe(7)
    expect(loaded.activeProfileId).toBe(profile.id)
    expect(await getBackupCount()).toBe(1)

    await archiveProfile(profile.id)
    const afterArchive = await loadLocalData()
    expect(afterArchive.profiles).toHaveLength(0)
    expect(afterArchive.activeProfileId).toBeNull()
    expect(await getBackupCount()).toBe(2)
  })

  it('поддерживает снимки состояния, возврат из корзины и полную выгрузку профилей', async () => {
    const p1 = { ...createProfile('Маша'), progress: { ...createProfile('Маша').progress, totalSolved: 12 } }
    const p2 = { ...createProfile('Петя'), progress: { ...createProfile('Петя').progress, totalSolved: 5 } }
    await saveProfile(p1)
    await saveProfile(p2)
    await setActiveProfileId(p1.id)

    const snaps = await createSnapshot('тестовый снимок')
    expect(snaps.length).toBeGreaterThanOrEqual(1)

    await archiveProfile(p2.id, 'delete')
    const afterDelete = await loadLocalData()
    expect(afterDelete.profiles).toHaveLength(1)

    const vault = await loadVaultData()
    const p2Trash = vault.trash.find((entry) => entry.profileId === p2.id)
    expect(p2Trash).toBeDefined()

    const restored = await restoreTrashEntry(p2Trash!.id)
    expect(restored?.name).toBe('Петя')
    expect((await loadLocalData()).profiles).toHaveLength(2)

    // Полная выгрузка и импорт всех профилей
    const backup = createProfileBackup(p1, [p1, p2], p1.id)
    const parsed = parseBackupPayload(JSON.stringify(backup))
    expect(parsed.kind).toBe('all')
    if (parsed.kind === 'all') {
      await replaceAllProfiles(parsed.profiles, parsed.activeProfileId)
    }

    // Откат к снимку
    const restoredSnap = await restoreSnapshotSlot(snaps[0]!.slot)
    expect(restoredSnap?.profiles).toHaveLength(2)

    // Окончательное удаление записи из корзины
    const vaultAfter = await loadVaultData()
    if (vaultAfter.trash[0]) {
      await deleteTrashEntry(vaultAfter.trash[0].id)
    }
  })
})
