import { ACCESSORY_CATALOG, type ChildProfile } from '../../state/profile'
import { Owl } from '../components/Owl'

const ACCENTS = ['#7560df', '#52a99a', '#f0a44f', '#df7196', '#548bcc', '#7a8c55'] as const

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
          {ACCESSORY_CATALOG.map((item) => {
            const isOwned = owned.includes(item.id)
            const isEquipped = equipped.includes(item.id)
            return <article className={`accessory-card panel-card${isEquipped ? ' accessory-equipped' : ''}`} key={item.id}>
              <span className="accessory-picture" aria-hidden="true">{item.icon}</span>
              <strong>{item.name}</strong>
              {isOwned ? <button className={isEquipped ? 'secondary-button accessory-action' : 'primary-button accessory-action'} type="button" onClick={() => onToggle(item.id)}>{isEquipped ? 'Снять' : 'Надеть'}</button> : <button className="secondary-button accessory-action" type="button" disabled={profile.rewards.crystals < item.price} onClick={() => onBuy(item.id)}>{item.price} 💎 <span className="visually-hidden">Купить {item.name}</span></button>}
            </article>
          })}
        </div>
      </section>
      <section className="shop-section accent-section" aria-labelledby="accent-heading">
        <div className="section-heading"><div><p className="eyebrow">ЦВЕТ ДНЯ</p><h2 id="accent-heading">Перекрасить БУКа</h2><p>Новый цвет стоит всего 1 💎</p></div></div>
        <div className="accent-options" role="group" aria-label="Выбор цвета БУКа">{ACCENTS.map((color) => <button type="button" key={color} className={`accent-swatch${profile.rewards.accentColor === color ? ' accent-swatch-selected' : ''}`} style={{ backgroundColor: color }} aria-label={`Перекрасить сову в цвет ${color}. Стоимость 1 кристалл`} aria-pressed={profile.rewards.accentColor === color} onClick={() => onRecolor(color)} />)}</div>
        <p className="shop-footnote">Выбор того же цвета бесплатный. Покупки только за игровые кристаллы.</p>
      </section>
    </main>
  )
}
