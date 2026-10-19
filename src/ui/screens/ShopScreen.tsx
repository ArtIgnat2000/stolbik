import { SHOP_CATALOG, type ChildProfile, type ItemRarity, type ShopItem } from '../../state/profile'
import { Owl } from '../components/Owl'

const ACCENTS = ['#7560df', '#52a99a', '#f0a44f', '#df7196', '#548bcc', '#7a8c55'] as const

const RARITY_LABELS: Record<ItemRarity, string> = {
  common: 'Обычное',
  rare: '✦ Редкое',
  legendary: '✦✦ Легендарное'
}

interface ShopScreenProps {
  profile: ChildProfile
  onBack: () => void
  onBuy: (id: string) => void
  onToggle: (id: string) => void
  onRecolor: (color: string) => void
}

interface WearableCardProps {
  item: ShopItem
  owned: boolean
  equipped: boolean
  crystals: number
  onBuy: (id: string) => void
  onToggle: (id: string) => void
}

function WearableCard({ item, owned, equipped, crystals, onBuy, onToggle }: WearableCardProps) {
  return (
    <article className={`accessory-card panel-card${equipped ? ' accessory-equipped' : ''}`}>
      <span className="accessory-picture" aria-hidden="true">{item.icon}</span>
      <strong>{item.name}</strong>
      <small className="item-flavor">{item.flavor}</small>
      <span className={`item-rarity rarity-${item.rarity}`}>{RARITY_LABELS[item.rarity]}</span>
      {owned
        ? <button className={equipped ? 'secondary-button accessory-action' : 'primary-button accessory-action'} type="button" onClick={() => onToggle(item.id)}>{equipped ? 'Снять' : 'Надеть'}</button>
        : <button className="secondary-button accessory-action" type="button" disabled={crystals < item.price} onClick={() => onBuy(item.id)}>{item.price} 💎 <span className="visually-hidden">Купить {item.name}</span></button>}
    </article>
  )
}

export function ShopScreen({ profile, onBack, onBuy, onToggle, onRecolor }: ShopScreenProps) {
  const owned = profile.rewards.accessoriesOwned
  const equipped = profile.rewards.accessoriesEquipped
  const accessories = SHOP_CATALOG.filter((item) => item.category === 'accessories')
  const shoes = SHOP_CATALOG.filter((item) => item.category === 'shoes')
  return (
    <main className="shop-page page-shell">
      <header className="app-header shop-header"><button className="icon-button" type="button" aria-label="Назад домой" onClick={onBack}>←</button><div className="brand-lockup"><span className="brand-mark">+</span><span>УГОЛОК БУКа</span></div><span className="crystal-pill shop-crystals">💎 {profile.rewards.crystals}</span></header>
      <section className="shop-hero-card">
        <div><p className="eyebrow">МАГАЗИН БУКА</p><h1>Сделаем сову ещё наряднее</h1><p>Кристаллы можно собирать в уроках и ежедневных заданиях.</p><div className="costume-progress"><div className="costume-progress-copy"><strong>Пазл костюма</strong><span>{profile.rewards.costumeFragments} из 9 фрагментов · открыто костюмов: {profile.rewards.costumesUnlocked}</span></div><div className="fragment-grid" aria-label={`${profile.rewards.costumeFragments} из 9 фрагментов костюма`}>{Array.from({ length: 9 }, (_, index) => <i className={index < profile.rewards.costumeFragments ? 'fragment-filled' : ''} key={index}>{index < profile.rewards.costumeFragments ? '✦' : ''}</i>)}</div></div></div>
        <Owl size={150} accent={profile.rewards.accentColor} accessories={equipped} />
      </section>
      <section className="shop-section" aria-labelledby="accessories-heading">
        <div className="section-heading"><div><p className="eyebrow">МАЛЕНЬКИЕ РАДОСТИ</p><h2 id="accessories-heading">Аксессуары</h2></div><span className="soft-badge">Покупки без спешки</span></div>
        <div className="accessory-grid">
          {accessories.map((item) => <WearableCard key={item.id} item={item} owned={owned.includes(item.id)} equipped={equipped.includes(item.id)} crystals={profile.rewards.crystals} onBuy={onBuy} onToggle={onToggle} />)}
        </div>
      </section>
      <section className="shop-section" aria-labelledby="shoes-heading">
        <div className="section-heading"><div><p className="eyebrow">НОВОЕ: ГАРДЕРОБ</p><h2 id="shoes-heading">Обувь</h2></div><span className="soft-badge">Одна пара за раз</span></div>
        <figure className="shop-illustration">
          <img src={`${import.meta.env.BASE_URL}shop/wardrobe.webp`} alt="Сова БУК примеряет обувь в гардеробе: кеды, ботинки, сандалии и ласты" loading="lazy" />
        </figure>
        <div className="accessory-grid">
          {shoes.map((item) => <WearableCard key={item.id} item={item} owned={owned.includes(item.id)} equipped={equipped.includes(item.id)} crystals={profile.rewards.crystals} onBuy={onBuy} onToggle={onToggle} />)}
        </div>
        <p className="shop-footnote">Обувь надевается на лапки БУКа: пока можно носить одну пару. Покупки только за игровые кристаллы.</p>
      </section>
      <section className="shop-section accent-section" aria-labelledby="accent-heading">
        <div className="section-heading"><div><p className="eyebrow">ЦВЕТ ДНЯ</p><h2 id="accent-heading">Перекрасить БУКа</h2><p>Новый цвет стоит всего 1 💎</p></div></div>
        <div className="accent-options" role="group" aria-label="Выбор цвета БУКа">{ACCENTS.map((color) => <button type="button" key={color} className={`accent-swatch${profile.rewards.accentColor === color ? ' accent-swatch-selected' : ''}`} style={{ backgroundColor: color }} aria-label={`Перекрасить сову в цвет ${color}. Стоимость 1 кристалл`} aria-pressed={profile.rewards.accentColor === color} onClick={() => onRecolor(color)} />)}</div>
        <p className="shop-footnote">Выбор того же цвета бесплатный. Покупки только за игровые кристаллы.</p>
      </section>
      <section className="shop-section teaser-section" aria-labelledby="collection-heading">
        <div className="section-heading"><div><p className="eyebrow">СКОРО В УГЛОКЕ БУКА</p><h2 id="collection-heading">Коллекция БУКа</h2></div><span className="soft-badge">Уже в планах</span></div>
        <figure className="shop-illustration teaser-illustration">
          <img src={`${import.meta.env.BASE_URL}shop/collection.webp`} alt="Коллекция БУКа: гараж с машиной, пристань с яхтой и полка гаджетов" loading="lazy" />
          <figcaption>Машины, яхты и гаджеты — ради них стоит копить кристаллы.</figcaption>
        </figure>
      </section>
    </main>
  )
}
