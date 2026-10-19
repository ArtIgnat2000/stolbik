import type { LevelId } from '../content/levels'

export type HintMode = 'question' | 'answer' | 'off'

export type ShopCategory = 'accessories' | 'shoes'

export type WearableSlot = 'head' | 'face' | 'neck' | 'chest' | 'feet'

export type ItemRarity = 'common' | 'rare' | 'legendary'

export interface ShopItem {
  id: string
  category: ShopCategory
  name: string
  flavor: string
  icon: string
  price: number
  rarity: ItemRarity
  wearable: WearableSlot
}

const EXCLUSIVE_WEARABLE_SLOTS: readonly WearableSlot[] = ['feet']

export function isExclusiveSlot(slot: WearableSlot): boolean {
  return EXCLUSIVE_WEARABLE_SLOTS.includes(slot)
}

export const SHOP_CATALOG: readonly ShopItem[] = Object.freeze([
  { id: 'cap', category: 'accessories', name: 'Кепка', flavor: 'Козырёк от солнечных примеров', icon: '🧢', price: 8, rarity: 'common', wearable: 'head' },
  { id: 'bow', category: 'accessories', name: 'Бантик', flavor: 'На каждый особый ответ', icon: '🎀', price: 8, rarity: 'common', wearable: 'head' },
  { id: 'glasses', category: 'accessories', name: 'Очки', flavor: 'Чтобы разглядеть каждый разряд', icon: '🤓', price: 10, rarity: 'common', wearable: 'face' },
  { id: 'scarf', category: 'accessories', name: 'Шарфик', flavor: 'Тёплый приём для верных ответов', icon: '🧣', price: 10, rarity: 'common', wearable: 'neck' },
  { id: 'medal', category: 'accessories', name: 'Медаль', flavor: 'За старания, а не за спешку', icon: '🏅', price: 12, rarity: 'rare', wearable: 'chest' },
  { id: 'shoes-first-step', category: 'shoes', name: 'Кеды «Первый шаг»', flavor: 'С ними точно не промахнёшься мимо ответа', icon: '👟', price: 10, rarity: 'common', wearable: 'feet' },
  { id: 'shoes-cozy', category: 'shoes', name: 'Тапочки «Уютные»', flavor: 'Для занятий, не вставая с кресла', icon: '🩴', price: 12, rarity: 'common', wearable: 'feet' },
  { id: 'shoes-breeze', category: 'shoes', name: 'Кроссовки «Ветерок»', flavor: 'Мчатся к новым примерам', icon: '👟', price: 16, rarity: 'common', wearable: 'feet' },
  { id: 'shoes-autumn', category: 'shoes', name: 'Ботинки «Осенний день»', flavor: 'И по лужам, и по разрядам', icon: '🥾', price: 20, rarity: 'common', wearable: 'feet' },
  { id: 'shoes-snowflake', category: 'shoes', name: 'Сапожки «Снежинка»', flavor: 'Тёплые даже в минус на доске', icon: '👢', price: 24, rarity: 'rare', wearable: 'feet' },
  { id: 'shoes-fins', category: 'shoes', name: 'Ласты «Морская прогулка»', flavor: 'Заплыв до самой пристани', icon: '🤿', price: 26, rarity: 'rare', wearable: 'feet' },
  { id: 'shoes-neon', category: 'shoes', name: 'Кроссовки «Неон»', flavor: 'Светятся в темноте и в уроках', icon: '👟', price: 30, rarity: 'legendary', wearable: 'feet' }
])

export function getShopItem(id: string): ShopItem | undefined {
  return SHOP_CATALOG.find((item) => item.id === id)
}

export interface ProfileSettings {
  lessonSize: 3 | 5 | 8
  soundEnabled: boolean
  hapticsEnabled: boolean
  keyboardEnabled: boolean
  defaultLevel: LevelId
  hintsMode: HintMode
}

export interface LevelProgress {
  crowns: number
  solved: number
  cleanSolved: number
  errors: number
}

export interface ProgressData {
  totalSolved: number
  totalErrors: number
  practiceMinutes: number
  levels: Record<string, LevelProgress>
  activityDays: string[]
}

export interface DailyProgress {
  date: string
  solvedExamples: number
  currentStreak: number
  bestStreak: number
  claimedTasks: string[]
  chestClaimed: boolean
}

export interface RewardData {
  crystals: number
  experience: number
  daily: DailyProgress
  costumeFragments: number
  costumesUnlocked: number
  weeklyRewardClaims: string[]
  accessoriesOwned: string[]
  accessoriesEquipped: string[]
  accentColor: string
}

export interface ChildProfile {
  id: string
  name: string
  avatar: string
  color: string
  createdAt: string
  settings: ProfileSettings
  progress: ProgressData
  rewards: RewardData
}

export const DEFAULT_SETTINGS: ProfileSettings = Object.freeze({
  lessonSize: 5,
  soundEnabled: true,
  hapticsEnabled: true,
  keyboardEnabled: false,
  defaultLevel: 1,
  hintsMode: 'question'
})

const EMPTY_LEVEL_PROGRESS: LevelProgress = Object.freeze({
  crowns: 0,
  solved: 0,
  cleanSolved: 0,
  errors: 0
})

export function getLevelProgress(profile: ChildProfile, levelId: number): LevelProgress {
  return profile.progress.levels[String(levelId)] ?? EMPTY_LEVEL_PROGRESS
}

export function getDailyProgress(profile: ChildProfile, date = new Date().toISOString().slice(0, 10)): DailyProgress {
  if (profile.rewards.daily.date === date) return profile.rewards.daily
  return {
    date,
    solvedExamples: 0,
    currentStreak: 0,
    bestStreak: 0,
    claimedTasks: [],
    chestClaimed: false
  }
}

export function getHighestUnlockedLevel(profile: ChildProfile): LevelId {
  for (let level = 1; level < 13; level += 1) {
    if (getLevelProgress(profile, level).crowns < 1) return level as LevelId
  }
  return 13
}

export function createProfile(name: string, color?: string): ChildProfile {
  const cleanName = name.trim().slice(0, 18) || 'Юный математик'
  const colors = ['#7762e8', '#51a99b', '#ec9a55', '#df7196', '#5389ca']
  const chosenColor = color ?? colors[Math.floor(Math.random() * colors.length)] ?? colors[0]!
  const safeId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `child-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const today = new Date().toISOString().slice(0, 10)
  return {
    id: safeId,
    name: cleanName,
    avatar: 'owl',
    color: chosenColor,
    createdAt: new Date().toISOString(),
    settings: { ...DEFAULT_SETTINGS },
    progress: {
      totalSolved: 0,
      totalErrors: 0,
      practiceMinutes: 0,
      levels: {},
      activityDays: []
    },
    rewards: {
      crystals: 0,
      experience: 0,
      daily: { date: today, solvedExamples: 0, currentStreak: 0, bestStreak: 0, claimedTasks: [], chestClaimed: false },
      costumeFragments: 0,
      costumesUnlocked: 0,
      weeklyRewardClaims: [],
      accessoriesOwned: [],
      accessoriesEquipped: [],
      accentColor: chosenColor
    }
  }
}

export function isChildProfile(value: unknown): value is ChildProfile {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<ChildProfile>
  const settings = candidate.settings as Partial<ProfileSettings> | undefined
  const progress = candidate.progress as Partial<ProgressData> | undefined
  const rewards = candidate.rewards as Partial<RewardData> | undefined
  const daily = rewards?.daily as Partial<DailyProgress> | undefined
  const validCount = (count: unknown) => typeof count === 'number' && Number.isSafeInteger(count) && count >= 0
  const validStrings = (items: unknown) => Array.isArray(items) && items.every((item) => typeof item === 'string')
  const levels = progress?.levels
  const validLevels = !!levels && typeof levels === 'object' && Object.values(levels).every((level) => (
    !!level && validCount(level.crowns) && level.crowns <= 3 && validCount(level.solved) && validCount(level.cleanSolved) && validCount(level.errors)
  ))

  return typeof candidate.id === 'string'
    && typeof candidate.name === 'string'
    && typeof candidate.avatar === 'string'
    && typeof candidate.color === 'string'
    && typeof candidate.createdAt === 'string'
    && (settings?.lessonSize === 3 || settings?.lessonSize === 5 || settings?.lessonSize === 8)
    && typeof settings.soundEnabled === 'boolean'
    && typeof settings.hapticsEnabled === 'boolean'
    && typeof settings.keyboardEnabled === 'boolean'
    && typeof settings.defaultLevel === 'number' && Number.isInteger(settings.defaultLevel) && settings.defaultLevel >= 1 && settings.defaultLevel <= 13
    && (settings.hintsMode === 'question' || settings.hintsMode === 'answer' || settings.hintsMode === 'off')
    && validCount(progress?.totalSolved)
    && validCount(progress?.totalErrors)
    && validCount(progress?.practiceMinutes)
    && validLevels
    && validStrings(progress?.activityDays)
    && validCount(rewards?.crystals)
    && validCount(rewards?.experience)
    && !!daily
    && typeof daily.date === 'string'
    && validCount(daily.solvedExamples)
    && validCount(daily.currentStreak)
    && validCount(daily.bestStreak)
    && validStrings(daily.claimedTasks)
    && typeof daily.chestClaimed === 'boolean'
    && validCount(rewards?.costumeFragments) && (rewards?.costumeFragments ?? 9) < 9
    && validCount(rewards?.costumesUnlocked)
    && validStrings(rewards?.weeklyRewardClaims)
    && validStrings(rewards?.accessoriesOwned)
    && validStrings(rewards?.accessoriesEquipped)
    && typeof rewards?.accentColor === 'string'
}
