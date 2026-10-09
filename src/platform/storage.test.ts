import { beforeEach, describe, expect, it } from 'vitest'
import { archiveProfile, getBackupCount, loadLocalData, resetLocalDatabaseForTests, saveProfile, setActiveProfileId } from './database'
import { createProfile } from '../state/profile'

beforeEach(async () => {
  await resetLocalDatabaseForTests()
})

describe('локальное хранилище профилей', () => {
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
})
