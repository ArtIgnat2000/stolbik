import { useMemo, useState } from 'react'
import { getShopItem, isExclusiveSlot, type ChildProfile, type ItemRarity, type ShopItem } from '../../state/profile'
import { Owl } from '../components/Owl'

const ACCENTS = ['#7560df', '#52a99a', '#f0a44f', '#df7196', '#548bcc', '#7a8c55'] as const

const RARITY_LABELS: Record<ItemRarity, string> = {
  common: 'Обычное',
  rare: '✦ Редкое',
  legendary: '✦✦ Легендарное'
}

const CATEGORY_LABELS: Record<ShopItem['category'], string> = {
  accessories: 'Аксессуар',
  shoes: 'Обувь'
}

interface SceneSpot {
  itemId: string
  x: number
  y: number
}

const WARDROBE_SPOTS: readonly SceneSpot[] = [
  { itemId: 'cap', x: 11, y: 22 },
  { itemId: 'bow', x: 26, y: 22 },
  { itemId: 'glasses', x: 41, y: 22 },
  { itemId: 'scarf', x: 56, y: 22 },
  { itemId: 'medal', x: 11, y: 50 },
  { itemId: 'shoes-first-step', x: 26, y: 50 },
  { itemId: 'shoes-cozy', x: 41, y: 50 },
  { itemId: 'shoes-breeze', x: 56, y: 50 },
  { itemId: 'shoes-autumn', x: 11, y: 76 },
  { itemId: 'shoes-snowflake', x: 26, y: 76 },
  { itemId: 'shoes-fins', x: 41, y: 76 },
  { itemId: 'shoes-neon', x: 56, y: 76 }
]

interface CollectionSpot {
  id: string
  icon: string
  title: string
  blurb: string
  x: number
  y: number
}

const COLLECTION_SPOTS: readonly CollectionSpot[] = [
  { id: 'garage', icon: '🚗', title: 'Гараж БУКа', blurb: 'Самокаты, велосипеды и машины — от «Пружинки» за 48 💎 до «Молнии» за 165 💎.', x: 20, y: 58 },
  { id: 'pier', icon: '⛵', title: 'Пристань БУКа', blurb: 'Лодки, катера и яхты — мечта, ради которой стоит копить неделями.', x: 50, y: 42 },
  { id: 'gadgets', icon: '📱', title: 'Полка гаджетов', blurb: 'Калькулятор «Умножайка», часы «Тик-так» и телефон «Алло».', x: 80, y: 36 },
  { id: 'piggy', icon: '🎯', title: 'Копилка мечты', blurb: 'Отложи кристаллы на заветную вещь — и следи, как растёт цель.', x: 68, y: 76 }
]

interface ShopScreenProps {
  profile: ChildProfile
  onBack: () => void
  onBuy: (id: string) => void
  onToggle: (id: string) => void
  onRecolor: (color: string) => void
}

export function ShopScreen({ profile, onBack, onBuy, onToggle, onRecolor }: ShopScreenProps) {
  const owned = profile.rewards.accessoriesOwned
  const equipped = profile.rewards.accessoriesEquipped
  const crystals = profile.rewards.crystals
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)

  const selectedItem = selectedId ? getShopItem(selectedId) : undefined
  const previewAccessories = useMemo(() => {
    if (!selectedItem) return equipped
    const base = equipped.filter((id) => id !== selectedItem.id)
    const withoutSameSlot = isExclusiveSlot(selectedItem.wearable)
      ? base.filter((id) => getShopItem(id)?.wearable !== selectedItem.wearable)
      : base
    return [...withoutSameSlot, selectedItem.id]
  }, [selectedItem, equipped])
  const selectedCollection = COLLECTION_SPOTS.find((spot) => spot.id === selectedCollectionId)
  return (
    <main className="shop-page page-shell">
      <header className="app-header shop-header"><button className="icon-button" type="button" aria-label="Назад домой" onClick={onBack}>←</button><div className="brand-lockup"><span className="brand-mark">+</span><span>УГОЛОК БУКа</span></div><span className="crystal-pill shop-crystals">💎 {crystals}</span></header>
      <section className="shop-hero-card">
        <div><p className="eyebrow">МАГАЗИН БУКА</p><h1>Сделаем сову ещё наряднее</h1><p>Кристаллы можно собирать в уроках и ежедневных заданиях.</p><div className="costume-progress"><div className="costume-progress-copy"><strong>Пазл костюма</strong><span>{profile.rewards.costumeFragments} из 9 фрагментов · открыто костюмов: {profile.rewards.costumesUnlocked}</span></div><div className="fragment-grid" aria-label={`${profile.rewards.costumeFragments} из 9 фрагментов костюма`}>{Array.from({ length: 9 }, (_, index) => <i className={index < profile.rewards.costumeFragments ? 'fragment-filled' : ''} key={index}>{index < profile.rewards.costumeFragments ? '✦' : ''}</i>)}</div></div></div>
        <Owl size={150} accent={profile.rewards.accentColor} accessories={equipped} />
      </section>
      <section className="shop-section" aria-labelledby="wardrobe-heading">
        <div className="section-heading"><div><p className="eyebrow">МАЛЕНЬКИЕ РАДОСТИ</p><h2 id="wardrobe-heading">Гардероб БУКа</h2></div><span className="soft-badge">Весь каталог — на витрине</span></div>
        <div className="shop-scene shop-scene-wardrobe">
          <img className="shop-scene-image" src={`${import.meta.env.BASE_URL}shop/wardrobe.webp`} alt="Интерактивная витрина гардероба БУКа" loading="lazy" />
          <span className="scene-badge" aria-hidden="true">✨ Нажми на вещь</span>
          {WARDROBE_SPOTS.map((spot) => {
            const item = getShopItem(spot.itemId)
            if (!item) return null
            const isOwned = owned.includes(item.id)
            const isEquipped = equipped.includes(item.id)
            const isSelected = selectedId === item.id
            const stateLabel = `${isOwned ? 'Куплено' : `${item.price} кристаллов`}${isEquipped ? ', надето' : ''}`
            return (
              <button
                key={item.id}
                type="button"
                className={`shop-spot${isOwned ? ' spot-owned' : ''}${isEquipped ? ' spot-equipped' : ''}${!isOwned && crystals < item.price ? ' spot-poor' : ''}${isSelected ? ' spot-selected' : ''}`}
                style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                aria-label={`${item.name}. ${stateLabel}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedId(isSelected ? null : item.id)}
              >
                <span className="spot-icon" aria-hidden="true">{item.icon}</span>
                <span className="spot-price" aria-hidden="true">{isOwned ? '✓' : `💎 ${item.price}`}</span>
              </button>
            )
          })}
          <div className="spot-panel" aria-live="polite">
            {selectedItem ? (
              <>
                <Owl size={88} accent={profile.rewards.accentColor} accessories={previewAccessories} />
                <div className="spot-panel-copy">
                  <p className="eyebrow">{RARITY_LABELS[selectedItem.rarity]} · {CATEGORY_LABELS[selectedItem.category]}</p>
                  <strong>{selectedItem.name}</strong>
                  <small>{selectedItem.flavor}</small>
                </div>
                <div className="spot-panel-actions">
                  {owned.includes(selectedItem.id)
                    ? (equipped.includes(selectedItem.id)
                        ? <button className="secondary-button" type="button" onClick={() => onToggle(selectedItem.id)}>Снять</button>
                        : <button className="primary-button" type="button" onClick={() => onToggle(selectedItem.id)}>Надеть</button>)
                    : <button className="primary-button" type="button" disabled={crystals < selectedItem.price} onClick={() => onBuy(selectedItem.id)}>Купить · {selectedItem.price} 💎</button>}
                  <small className="spot-panel-note">{owned.includes(selectedItem.id) ? 'БУК уже примеряет эту вещь' : crystals < selectedItem.price ? 'Пока не хватает кристаллов — загляни в уроки' : 'БУК примеряет вещь прямо сейчас'}</small>
                </div>
              </>
            ) : (
              <div className="spot-panel-copy"><strong>Выбери вещь на витрине</strong><small>Нажми на любую карточку — БУК тут же примерит её. Купить можно за кристаллы из уроков.</small></div>
            )}
          </div>
        </div>
        <p className="shop-footnote">Обувь надевается на лапки БУКа (одна пара за раз), аксессуары можно совмещать. Покупки только за игровые кристаллы.</p>
      </section>
      <section className="shop-section accent-section" aria-labelledby="accent-heading">
        <div className="section-heading"><div><p className="eyebrow">ЦВЕТ ДНЯ</p><h2 id="accent-heading">Перекрасить БУКа</h2><p>Новый цвет стоит всего 1 💎</p></div></div>
        <div className="accent-options" role="group" aria-label="Выбор цвета БУКа">{ACCENTS.map((color) => <button type="button" key={color} className={`accent-swatch${profile.rewards.accentColor === color ? ' accent-swatch-selected' : ''}`} style={{ backgroundColor: color }} aria-label={`Перекрасить сову в цвет ${color}. Стоимость 1 кристалл`} aria-pressed={profile.rewards.accentColor === color} onClick={() => onRecolor(color)} />)}</div>
        <p className="shop-footnote">Выбор того же цвета бесплатный. Покупки только за игровые кристаллы.</p>
      </section>
      <section className="shop-section teaser-section" aria-labelledby="collection-heading">
        <div className="section-heading"><div><p className="eyebrow">СКОРО В УГЛОКЕ БУКА</p><h2 id="collection-heading">Коллекция БУКа</h2></div><span className="soft-badge">Уже в планах</span></div>
        <div className="shop-scene shop-scene-collection">
          <img className="shop-scene-image" src={`${import.meta.env.BASE_URL}shop/collection.webp`} alt="Интерактивный тизер коллекции БУКа: гараж, пристань и полка гаджетов" loading="lazy" />
          <span className="scene-badge" aria-hidden="true">✨ Загляни в будущее</span>
          {COLLECTION_SPOTS.map((spot) => (
            <button
              key={spot.id}
              type="button"
              className={`shop-spot spot-coming${selectedCollectionId === spot.id ? ' spot-selected' : ''}`}
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              aria-label={`${spot.title}. Скоро`}
              aria-pressed={selectedCollectionId === spot.id}
              onClick={() => setSelectedCollectionId(selectedCollectionId === spot.id ? null : spot.id)}
            >
              <span className="spot-icon" aria-hidden="true">{spot.icon}</span>
              <span className="spot-price" aria-hidden="true">скоро</span>
            </button>
          ))}
          <div className="spot-panel" aria-live="polite">
            {selectedCollection ? (
              <div className="spot-panel-copy"><p className="eyebrow">СКОРО</p><strong>{selectedCollection.title}</strong><small>{selectedCollection.blurb}</small></div>
            ) : (
              <div className="spot-panel-copy"><strong>Машины, яхты и гаджеты уже в пути</strong><small>Нажми на точки на картинке — расскажем, что здесь появится.</small></div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
