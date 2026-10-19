import { useMemo, useState, type CSSProperties } from 'react'
import { SHOP_CATALOG, getItemGroup, getShopItem, isExclusiveSlot, type ChildProfile, type ItemRarity, type ShopGroup, type ShopItem } from '../../state/profile'
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

interface ShopTab {
  id: ShopGroup | 'all'
  label: string
  icon: string
  color: string
}

const SHOP_TABS: readonly ShopTab[] = [
  { id: 'all', label: 'Всё', icon: '🎒', color: '#7560df' },
  { id: 'head', label: 'Головные уборы', icon: '🎩', color: '#df7196' },
  { id: 'face', label: 'Очки', icon: '👓', color: '#52a99a' },
  { id: 'clothes', label: 'Одежда', icon: '🧣', color: '#f0a44f' },
  { id: 'feet', label: 'Обувь', icon: '👟', color: '#548bcc' }
]

const ART_IDS = new Set<string>([
  'cap', 'bow', 'glasses', 'scarf', 'medal',
  'shoes-first-step', 'shoes-cozy', 'shoes-breeze', 'shoes-autumn', 'shoes-snowflake'
])

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

function zoomOriginFor(item: ShopItem | undefined): string {
  if (!item) return '50% 50%'
  if (item.wearable === 'feet') return '50% 85%'
  if (item.wearable === 'face') return '50% 25%'
  if (item.wearable === 'head') return '50% 12%'
  return '50% 55%'
}

interface ShopScreenProps {
  profile: ChildProfile
  onBack: () => void
  onBuy: (id: string) => void
  onToggle: (id: string) => void
  onRecolor: (color: string) => void
}

interface GoodsCardProps {
  item: ShopItem
  owned: boolean
  equipped: boolean
  affordable: boolean
  selected: boolean
  onSelect: (id: string) => void
}

function GoodsCard({ item, owned, equipped, affordable, selected, onSelect }: GoodsCardProps) {
  const stateBadge = equipped
    ? <span className="goods-state state-equipped">✦ Надето</span>
    : owned
      ? <span className="goods-state state-owned">✓ Куплено</span>
      : affordable
        ? <span className="goods-state">На приме</span>
        : <span className="goods-state state-locked">🔒 Пока не хватает</span>
  return (
    <button
      type="button"
      className={`goods-card${selected ? ' goods-card-selected' : ''}${equipped ? ' goods-card-equipped' : ''}`}
      aria-label={`${item.name}. ${owned ? (equipped ? 'Надето' : 'Куплено') : `${item.price} кристаллов`}`}
      aria-pressed={selected}
      onClick={() => onSelect(item.id)}
    >
      <span className="goods-art" aria-hidden="true">
        {ART_IDS.has(item.id) && <img src={`${import.meta.env.BASE_URL}shop/items/${item.id}.webp`} alt="" loading="lazy" />}
        <span className="goods-art-fallback">{item.icon}</span>
      </span>
      <strong className="goods-name">{item.name}</strong>
      <small className="goods-flavor">{item.flavor}</small>
      <span className="goods-meta"><span className="goods-price">💎 {item.price}</span>{stateBadge}</span>
    </button>
  )
}

export function ShopScreen({ profile, onBack, onBuy, onToggle, onRecolor }: ShopScreenProps) {
  const owned = profile.rewards.accessoriesOwned
  const equipped = profile.rewards.accessoriesEquipped
  const crystals = profile.rewards.crystals
  const [activeGroup, setActiveGroup] = useState<ShopGroup | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(false)
  const [sparkleKey, setSparkleKey] = useState(0)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)

  const celebrate = () => setSparkleKey((key) => key + 1)

  const selectedItem = selectedId ? getShopItem(selectedId) : undefined
  const goods = useMemo(() => (
    activeGroup === 'all' ? SHOP_CATALOG : SHOP_CATALOG.filter((item) => getItemGroup(item) === activeGroup)
  ), [activeGroup])
  const previewAccessories = useMemo(() => {
    if (!selectedItem) return equipped
    const base = equipped.filter((id) => id !== selectedItem.id)
    const withoutSameSlot = isExclusiveSlot(selectedItem.wearable)
      ? base.filter((id) => getShopItem(id)?.wearable !== selectedItem.wearable)
      : base
    return [...withoutSameSlot, selectedItem.id]
  }, [selectedItem, equipped])
  const selectedCollection = COLLECTION_SPOTS.find((spot) => spot.id === selectedCollectionId)
  const tabCount = (tabId: ShopGroup | 'all') => (
    tabId === 'all' ? SHOP_CATALOG.length : SHOP_CATALOG.filter((item) => getItemGroup(item) === tabId).length
  )
  return (
    <main className="shop-page page-shell">
      <header className="app-header shop-header"><button className="icon-button" type="button" aria-label="Назад домой" onClick={onBack}>←</button><div className="brand-lockup"><span className="brand-mark">+</span><span>УГОЛОК БУКа</span></div><span className="crystal-pill shop-crystals">💎 {crystals}</span></header>
      <section className="shop-hero-card">
        <div><p className="eyebrow">МАГАЗИН БУКА</p><h1>Сделаем сову ещё наряднее</h1><p>Кристаллы можно собирать в уроках и ежедневных заданиях.</p><div className="costume-progress"><div className="costume-progress-copy"><strong>Пазл костюма</strong><span>{profile.rewards.costumeFragments} из 9 фрагментов · открыто костюмов: {profile.rewards.costumesUnlocked}</span></div><div className="fragment-grid" aria-label={`${profile.rewards.costumeFragments} из 9 фрагментов костюма`}>{Array.from({ length: 9 }, (_, index) => <i className={index < profile.rewards.costumeFragments ? 'fragment-filled' : ''} key={index}>{index < profile.rewards.costumeFragments ? '✦' : ''}</i>)}</div></div></div>
        <Owl size={150} accent={profile.rewards.accentColor} accessories={equipped} />
      </section>
      <section className="shop-section" aria-labelledby="wardrobe-heading">
        <div className="section-heading"><div><p className="eyebrow">МАЛЕНЬКИЕ РАДОСТИ</p><h2 id="wardrobe-heading">Гардероб БУКа</h2></div><span className="soft-badge">Примерка бесплатна</span></div>
        <div className="shop-sign">
          <img src={`${import.meta.env.BASE_URL}shop/wardrobe.webp`} alt="" loading="lazy" />
          <span className="shop-sign-label">✨ УГОЛОК БУКА · ПРИМЕРОЧНАЯ</span>
        </div>
        <div className="fitting-layout">
          <aside className="fitting-panel panel-card">
            <div className="fitting-stage" style={{ transformOrigin: zoomOriginFor(selectedItem), transform: zoom ? 'scale(1.75)' : 'scale(1)' }}>
              <Owl size={300} accent={profile.rewards.accentColor} accessories={previewAccessories} />
              {sparkleKey > 0 && <span className="fitting-sparkles" key={sparkleKey} aria-hidden="true">✦</span>}
            </div>
            <button className="secondary-button fitting-zoom" type="button" aria-pressed={zoom} onClick={() => setZoom(!zoom)}>{zoom ? '🔍 Обычный размер' : '🔍 Крупно'}</button>
            <div className="fitting-info" aria-live="polite">
              {selectedItem ? (
                <>
                  <p className="eyebrow">{RARITY_LABELS[selectedItem.rarity]} · {CATEGORY_LABELS[selectedItem.category]}</p>
                  <strong>{selectedItem.name}</strong>
                  <small>{selectedItem.flavor}</small>
                </>
              ) : (
                <>
                  <strong>Выбери вещь на витрине</strong>
                  <small>Тапни по любой карточке — БУК тут же примерит её. Крупный план поможет рассмотреть детали.</small>
                </>
              )}
            </div>
            {selectedItem && (
              <div className="fitting-actions">
                {owned.includes(selectedItem.id)
                  ? (equipped.includes(selectedItem.id)
                      ? <button className="secondary-button" type="button" onClick={() => onToggle(selectedItem.id)}>Снять</button>
                      : <button className="primary-button" type="button" onClick={() => { onToggle(selectedItem.id); celebrate() }}>Надеть</button>)
                  : <button className="primary-button" type="button" disabled={crystals < selectedItem.price} onClick={() => { onBuy(selectedItem.id); celebrate() }}>Купить · {selectedItem.price} 💎</button>}
                <small className="fitting-note">{owned.includes(selectedItem.id) ? 'Вещь уже твоя — надевай и носи' : crystals < selectedItem.price ? 'Пока не хватает кристаллов — загляни в уроки' : 'Примерка ни к чему не обязывает'}</small>
              </div>
            )}
          </aside>
          <div className="fitting-main">
            <div className="shop-tabs" role="group" aria-label="Разделы магазина">
              {SHOP_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`shop-tab${activeGroup === tab.id ? ' shop-tab-active' : ''}`}
                  style={{ '--tab-color': tab.color } as CSSProperties}
                  aria-pressed={activeGroup === tab.id}
                  onClick={() => setActiveGroup(tab.id)}
                >
                  <span aria-hidden="true">{tab.icon}</span>
                  <span>{tab.label}</span>
                  <small className="shop-tab-count">{tabCount(tab.id)}</small>
                </button>
              ))}
            </div>
            <div className="goods-grid" role="list" aria-label="Товары магазина">
              {goods.map((item) => (
                <div role="listitem" key={item.id}>
                  <GoodsCard item={item} owned={owned.includes(item.id)} equipped={equipped.includes(item.id)} affordable={crystals >= item.price} selected={selectedId === item.id} onSelect={(id) => setSelectedId(selectedId === id ? null : id)} />
                </div>
              ))}
            </div>
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
          <img className="shop-scene-image" src={`${import.meta.env.BASE_URL}shop/collection.webp`} alt="Тизер коллекции БУКа: гараж, пристань и полка гаджетов" loading="lazy" />
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
