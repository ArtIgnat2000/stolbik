import { beforeEach, describe, expect, it } from 'vitest'
import { resetLocalDatabaseForTests } from '../platform/database'
import { SHOP_CATALOG, getShopItem, isExclusiveSlot } from '../state/profile'
import { useAppStore } from '../state/store'

beforeEach(async () => {
  await resetLocalDatabaseForTests()
  useAppStore.setState({ profiles: [], activeProfileId: null, isReady: false, isLoading: false, storageWarning: null })
})

function giveCrystals(profileId: string, crystals: number): void {
  useAppStore.setState((state) => ({
    profiles: state.profiles.map((profile) => profile.id === profileId ? { ...profile, rewards: { ...profile.rewards, crystals } } : profile)
  }))
}

function equippedSlots(profileId: string): string[] {
  const profile = useAppStore.getState().profiles.find((candidate) => candidate.id === profileId)
  return (profile?.rewards.accessoriesEquipped ?? []).map((id) => getShopItem(id)?.wearable ?? id)
}

describe('каталог магазина', () => {
  it('содержит корректные товары с уникальными id', () => {
    const ids = SHOP_CATALOG.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const item of SHOP_CATALOG) {
      expect(item.name.trim()).not.toBe('')
      expect(item.flavor.trim()).not.toBe('')
      expect(item.icon).not.toBe('')
      expect(Number.isSafeInteger(item.price)).toBe(true)
      expect(item.price).toBeGreaterThan(0)
    }
  })

  it('включает раздел обуви: не меньше семи пар на слот «лапки»', () => {
    const shoes = SHOP_CATALOG.filter((item) => item.category === 'shoes')
    expect(shoes.length).toBeGreaterThanOrEqual(7)
    for (const item of shoes) {
      expect(item.wearable).toBe('feet')
      expect(isExclusiveSlot(item.wearable)).toBe(true)
    }
  })

  it('находит товар по id и не находит неизвестный', () => {
    expect(getShopItem('shoes-first-step')?.name).toBe('Кеды «Первый шаг»')
    expect(getShopItem('no-such-item')).toBeUndefined()
  })
})

describe('покупка и надевание обуви', () => {
  it('не покупает неизвестный товар и товар без кристаллов', () => {
    const { buyItem } = useAppStore.getState()
    const profileId = useAppStore.getState().createChildProfile('Тест')
    expect(buyItem(profileId, 'no-such-item')).toBe(false)
    giveCrystals(profileId, 5)
    expect(buyItem(profileId, 'shoes-first-step')).toBe(false)
    const profile = useAppStore.getState().profiles[0]!
    expect(profile.rewards.accessoriesOwned).toEqual([])
    expect(profile.rewards.crystals).toBe(5)
  })

  it('покупает кеды, списывает кристаллы и сразу надевает', () => {
    const { buyItem } = useAppStore.getState()
    const profileId = useAppStore.getState().createChildProfile('Тест')
    giveCrystals(profileId, 100)
    expect(buyItem(profileId, 'shoes-first-step')).toBe(true)
    const profile = useAppStore.getState().profiles[0]!
    expect(profile.rewards.crystals).toBe(90)
    expect(profile.rewards.accessoriesOwned).toContain('shoes-first-step')
    expect(profile.rewards.accessoriesEquipped).toContain('shoes-first-step')
    expect(buyItem(profileId, 'shoes-first-step')).toBe(false)
    expect(useAppStore.getState().profiles[0]!.rewards.crystals).toBe(90)
  })

  it('держит только одну пару на слоте «лапки»', () => {
    const { buyItem, toggleWearable } = useAppStore.getState()
    const profileId = useAppStore.getState().createChildProfile('Тест')
    giveCrystals(profileId, 100)
    buyItem(profileId, 'shoes-first-step')
    buyItem(profileId, 'shoes-cozy')
    const afterBuys = useAppStore.getState().profiles[0]!
    expect(afterBuys.rewards.accessoriesOwned).toEqual(expect.arrayContaining(['shoes-first-step', 'shoes-cozy']))
    expect(afterBuys.rewards.accessoriesEquipped).toEqual(['shoes-cozy'])

    toggleWearable(profileId, 'shoes-first-step')
    const afterSwitch = useAppStore.getState().profiles[0]!
    expect(afterSwitch.rewards.accessoriesEquipped).toEqual(['shoes-first-step'])

    toggleWearable(profileId, 'shoes-first-step')
    expect(useAppStore.getState().profiles[0]!.rewards.accessoriesEquipped).toEqual([])

    toggleWearable(profileId, 'shoes-first-step')
    expect(equippedSlots(profileId).filter((slot) => slot === 'feet')).toHaveLength(1)
  })

  it('позволяет носить аксессуары вместе и не надевает чужое', () => {
    const { buyItem, toggleWearable } = useAppStore.getState()
    const profileId = useAppStore.getState().createChildProfile('Тест')
    giveCrystals(profileId, 100)
    toggleWearable(profileId, 'cap')
    expect(useAppStore.getState().profiles[0]!.rewards.accessoriesEquipped).toEqual([])
    buyItem(profileId, 'cap')
    buyItem(profileId, 'glasses')
    buyItem(profileId, 'shoes-breeze')
    const profile = useAppStore.getState().profiles[0]!
    expect(profile.rewards.accessoriesEquipped).toEqual(expect.arrayContaining(['cap', 'glasses', 'shoes-breeze']))
    expect(profile.rewards.accessoriesEquipped).toHaveLength(3)
  })
})
