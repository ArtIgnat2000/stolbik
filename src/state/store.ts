import { create } from 'zustand'
import { loadLocalData, requestPersistentStorage, saveProfile, setActiveProfileId } from '../platform/database'
import { ACCESSORY_CATALOG, createProfile, getDailyProgress, getHighestUnlockedLevel, type ChildProfile, type DailyProgress, type HintMode, type LevelProgress, type ProfileSettings } from './profile'
import type { LevelId } from '../content/levels'

const EMPTY_PROFILES: ChildProfile[] = []
let bootPromise: Promise<void> | null = null

type StateSetter = (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void

export interface AppState {
  profiles: ChildProfile[]
  activeProfileId: string | null
  isReady: boolean
  isLoading: boolean
  storageWarning: string | null
  boot: () => Promise<void>
  createChildProfile: (name: string, color?: string) => string
  selectProfile: (profileId: string) => void
  updateSettings: (profileId: string, changes: Partial<ProfileSettings>) => void
  recordMistake: (profileId: string, levelId: LevelId) => void
  recordCorrect: (profileId: string, levelId: LevelId, firstTry: boolean, hintUsed: boolean) => void
  finishLesson: (profileId: string, levelId: LevelId, cleanSolved: number, lessonSize: number, durationMs: number) => void
  claimDailyTask: (profileId: string, taskId: 'examples' | 'streak' | 'level') => void
  claimDailyChest: (profileId: string) => void
  buyAccessory: (profileId: string, accessoryId: string) => boolean
  toggleAccessory: (profileId: string, accessoryId: string) => void
  recolorMascot: (profileId: string, color: string) => boolean
  resetProgress: (profileId: string) => void
  restoreProfile: (profileId: string, imported: ChildProfile) => void
  clearStorageWarning: () => void
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function weekStartKey(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7)
  return date.toISOString().slice(0, 10)
}

function updateDaily(profile: ChildProfile, date: string, updater: (daily: DailyProgress) => DailyProgress): ChildProfile {
  const daily = getDailyProgress(profile, date)
  return { ...profile, rewards: { ...profile.rewards, daily: updater(daily) } }
}

async function persistSafely(profile: ChildProfile, set: StateSetter): Promise<void> {
  try {
    await saveProfile(profile)
  } catch {
    set({ storageWarning: 'Не удалось сохранить данные в этом браузере. Пока профиль открыт, занятия продолжатся; проверьте свободное место и разрешение на хранение.' })
  }
}

function addActivityDay(profile: ChildProfile, date: string): string[] {
  if (profile.progress.activityDays.includes(date)) return profile.progress.activityDays
  return [...profile.progress.activityDays, date].slice(-60)
}

function emptyLevelProgress(): LevelProgress {
  return { crowns: 0, solved: 0, cleanSolved: 0, errors: 0 }
}

function replaceLevelProgress(profile: ChildProfile, levelId: LevelId, transform: (previous: LevelProgress) => LevelProgress): ChildProfile {
  const key = String(levelId)
  const previous = profile.progress.levels[key] ?? emptyLevelProgress()
  return {
    ...profile,
    progress: {
      ...profile.progress,
      levels: { ...profile.progress.levels, [key]: transform(previous) }
    }
  }
}

function updateProfileInStore(
  profileId: string,
  get: () => AppState,
  set: StateSetter,
  updater: (profile: ChildProfile) => ChildProfile
): ChildProfile | null {
  const current = get().profiles.find((candidate) => candidate.id === profileId)
  if (!current) return null
  const updated = updater(current)
  set((state) => ({ profiles: state.profiles.map((candidate) => candidate.id === profileId ? updated : candidate) }))
  void persistSafely(updated, set)
  return updated
}

function getDailyTaskComplete(profile: ChildProfile, taskId: 'examples' | 'streak' | 'level'): boolean {
  const daily = getDailyProgress(profile)
  if (taskId === 'examples') return daily.solvedExamples >= 5
  if (taskId === 'streak') return daily.bestStreak >= 3
  return getHighestUnlockedLevel(profile) >= 10
}

export const useAppStore = create<AppState>((set, get) => ({
  profiles: EMPTY_PROFILES,
  activeProfileId: null,
  isReady: false,
  isLoading: false,
  storageWarning: null,

  boot: () => {
    if (!bootPromise) {
      set({ isLoading: true })
      bootPromise = (async () => {
        try {
          const data = await loadLocalData()
          set({
            profiles: data.profiles,
            activeProfileId: data.activeProfileId,
            isReady: true,
            isLoading: false,
            storageWarning: null
          })
          void requestPersistentStorage()
        } catch {
          set({
            profiles: EMPTY_PROFILES,
            activeProfileId: null,
            isReady: true,
            isLoading: false,
            storageWarning: 'Локальное хранилище недоступно. Можно продолжить без сохранения — приложение не остановится.'
          })
        }
      })()
    }
    return bootPromise
  },

  createChildProfile: (name, color) => {
    const profile = createProfile(name, color)
    set((state) => ({
      profiles: [...state.profiles, profile],
      activeProfileId: profile.id,
      storageWarning: null
    }))
    void persistSafely(profile, set)
    void setActiveProfileId(profile.id).catch(() => {
      set({ storageWarning: 'Профиль открыт, но не удалось запомнить его выбор на этом устройстве.' })
    })
    return profile.id
  },

  selectProfile: (profileId) => {
    if (!get().profiles.some((profile) => profile.id === profileId)) return
    set({ activeProfileId: profileId, storageWarning: null })
    void setActiveProfileId(profileId).catch(() => {
      set({ storageWarning: 'Профиль выбран, но браузер не сохранил этот выбор.' })
    })
  },

  updateSettings: (profileId, changes) => {
    updateProfileInStore(profileId, get, set, (profile) => ({
      ...profile,
      settings: { ...profile.settings, ...changes }
    }))
  },

  recordMistake: (profileId, levelId) => {
    const date = todayKey()
    updateProfileInStore(profileId, get, set, (profile) => {
      const withLevel = replaceLevelProgress(profile, levelId, (previous) => ({ ...previous, errors: previous.errors + 1 }))
      return updateDaily({
        ...withLevel,
        progress: { ...withLevel.progress, totalErrors: withLevel.progress.totalErrors + 1 }
      }, date, (daily) => ({ ...daily, currentStreak: 0 }))
    })
  },

  recordCorrect: (profileId, levelId, firstTry, hintUsed) => {
    const date = todayKey()
    updateProfileInStore(profileId, get, set, (profile) => {
      const withLevel = replaceLevelProgress(profile, levelId, (previous) => ({
        ...previous,
        solved: previous.solved + 1,
        cleanSolved: previous.cleanSolved + (firstTry && !hintUsed ? 1 : 0)
      }))
      const withDaily = updateDaily(withLevel, date, (daily) => {
        const currentStreak = daily.currentStreak + 1
        return {
          ...daily,
          solvedExamples: daily.solvedExamples + 1,
          currentStreak,
          bestStreak: Math.max(daily.bestStreak, currentStreak)
        }
      })
      const streak = withDaily.rewards.daily.currentStreak
      const streakBonus = streak > 0 && streak % 5 === 0 ? 1 : 0
      return {
        ...withDaily,
        progress: {
          ...withDaily.progress,
          totalSolved: withDaily.progress.totalSolved + 1,
          activityDays: addActivityDay(withDaily, date)
        },
        rewards: {
          ...withDaily.rewards,
          crystals: withDaily.rewards.crystals + streakBonus,
          experience: withDaily.rewards.experience + (hintUsed ? 4 : 8)
        }
      }
    })
  },

  finishLesson: (profileId, levelId, cleanSolved, lessonSize, durationMs) => {
    const date = todayKey()
    updateProfileInStore(profileId, get, set, (profile) => {
      const cleanRatio = lessonSize > 0 ? cleanSolved / lessonSize : 0
      const effectiveRatio = cleanRatio + (1 - cleanRatio) * 0.75
      const crowns = effectiveRatio >= 0.95 ? 3 : effectiveRatio >= 0.8 ? 2 : effectiveRatio >= 0.6 ? 1 : 0
      const withLevel = replaceLevelProgress(profile, levelId, (previous) => ({
        ...previous,
        crowns: Math.max(previous.crowns, crowns)
      }))
      let costumeFragments = withLevel.rewards.costumeFragments + 1
      let costumesUnlocked = withLevel.rewards.costumesUnlocked
      if (costumeFragments >= 9) {
        costumeFragments -= 9
        costumesUnlocked += 1
      }
      const activityDays = addActivityDay(withLevel, date)
      const thisWeek = weekStartKey(date)
      const nextWeekDate = new Date(`${thisWeek}T00:00:00.000Z`)
      nextWeekDate.setUTCDate(nextWeekDate.getUTCDate() + 7)
      const nextWeek = nextWeekDate.toISOString().slice(0, 10)
      const daysThisWeek = activityDays.filter((day) => day >= thisWeek && day < nextWeek).length
      const weeklyRewardClaims = [...withLevel.rewards.weeklyRewardClaims]
      let weeklyBonus = 0
      for (const reward of [{ days: 3, crystals: 3 }, { days: 5, crystals: 5 }, { days: 7, crystals: 8 }]) {
        const claimId = `${thisWeek}:${reward.days}`
        if (daysThisWeek >= reward.days && !weeklyRewardClaims.includes(claimId)) {
          weeklyRewardClaims.push(claimId)
          weeklyBonus += reward.crystals
        }
      }
      return {
        ...withLevel,
        progress: {
          ...withLevel.progress,
          practiceMinutes: withLevel.progress.practiceMinutes + Math.max(1, Math.round(durationMs / 60_000)),
          activityDays
        },
        rewards: {
          ...withLevel.rewards,
          crystals: withLevel.rewards.crystals + 5 + weeklyBonus,
          experience: withLevel.rewards.experience + 10,
          costumeFragments,
          costumesUnlocked,
          weeklyRewardClaims: weeklyRewardClaims.slice(-60)
        }
      }
    })
  },

  claimDailyTask: (profileId, taskId) => {
    const date = todayKey()
    updateProfileInStore(profileId, get, set, (profile) => {
      const daily = getDailyProgress(profile, date)
      if (daily.claimedTasks.includes(taskId) || !getDailyTaskComplete(profile, taskId)) return profile
      return {
        ...profile,
        rewards: {
          ...profile.rewards,
          crystals: profile.rewards.crystals + 3,
          daily: { ...daily, claimedTasks: [...daily.claimedTasks, taskId] }
        }
      }
    })
  },

  claimDailyChest: (profileId) => {
    const date = todayKey()
    updateProfileInStore(profileId, get, set, (profile) => {
      const daily = getDailyProgress(profile, date)
      if (daily.claimedTasks.length < 3 || daily.chestClaimed) return profile
      return {
        ...profile,
        rewards: {
          ...profile.rewards,
          crystals: profile.rewards.crystals + 15,
          daily: { ...daily, chestClaimed: true }
        }
      }
    })
  },

  buyAccessory: (profileId, accessoryId) => {
    const accessory = ACCESSORY_CATALOG.find((item) => item.id === accessoryId)
    if (!accessory) return false
    let bought = false
    updateProfileInStore(profileId, get, set, (profile) => {
      if (profile.rewards.accessoriesOwned.includes(accessoryId) || profile.rewards.crystals < accessory.price) return profile
      bought = true
      return {
        ...profile,
        rewards: {
          ...profile.rewards,
          crystals: profile.rewards.crystals - accessory.price,
          accessoriesOwned: [...profile.rewards.accessoriesOwned, accessoryId],
          accessoriesEquipped: [...profile.rewards.accessoriesEquipped, accessoryId]
        }
      }
    })
    return bought
  },

  toggleAccessory: (profileId, accessoryId) => {
    updateProfileInStore(profileId, get, set, (profile) => {
      if (!profile.rewards.accessoriesOwned.includes(accessoryId)) return profile
      const isEquipped = profile.rewards.accessoriesEquipped.includes(accessoryId)
      return {
        ...profile,
        rewards: {
          ...profile.rewards,
          accessoriesEquipped: isEquipped
            ? profile.rewards.accessoriesEquipped.filter((id) => id !== accessoryId)
            : [...profile.rewards.accessoriesEquipped, accessoryId]
        }
      }
    })
  },

  recolorMascot: (profileId, color) => {
    let recolored = false
    updateProfileInStore(profileId, get, set, (profile) => {
      if (profile.rewards.accentColor === color || profile.rewards.crystals < 1) return profile
      recolored = true
      return {
        ...profile,
        rewards: {
          ...profile.rewards,
          crystals: profile.rewards.crystals - 1,
          accentColor: color
        }
      }
    })
    return recolored
  },

  resetProgress: (profileId) => {
    updateProfileInStore(profileId, get, set, (profile) => {
      const fresh = createProfile(profile.name, profile.color)
      return { ...fresh, id: profile.id, createdAt: profile.createdAt, settings: profile.settings, avatar: profile.avatar }
    })
  },

  restoreProfile: (profileId, imported) => {
    updateProfileInStore(profileId, get, set, (profile) => ({
      ...imported,
      id: profile.id,
      name: profile.name,
      color: profile.color,
      createdAt: profile.createdAt
    }))
  },

  clearStorageWarning: () => set({ storageWarning: null })
}))

export function getDailyTaskState(profile: ChildProfile, taskId: 'examples' | 'streak' | 'level'): { progress: number; goal: number; complete: boolean; claimed: boolean } {
  const daily = getDailyProgress(profile)
  const config = taskId === 'examples'
    ? { progress: daily.solvedExamples, goal: 5 }
    : taskId === 'streak'
      ? { progress: daily.bestStreak, goal: 3 }
      : { progress: getHighestUnlockedLevel(profile), goal: 10 }
  return {
    ...config,
    complete: taskId === 'level' ? config.progress >= config.goal : config.progress >= config.goal,
    claimed: daily.claimedTasks.includes(taskId)
  }
}

export function getHintModeLabel(mode: HintMode): string {
  if (mode === 'answer') return 'Можно показать ответ сразу'
  if (mode === 'off') return 'Подсказки выключены'
  return 'Сначала вопрос, потом ответ'
}
