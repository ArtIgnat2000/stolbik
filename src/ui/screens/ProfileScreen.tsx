import { useState, type FormEvent } from 'react'
import type { ChildProfile } from '../../state/profile'
import { Owl } from '../components/Owl'

const PROFILE_COLORS = ['#7762e8', '#51a99b', '#ec9a55', '#df7196', '#5389ca'] as const

interface ProfileScreenProps {
  profiles: readonly ChildProfile[]
  activeProfileId: string | null
  storageWarning: string | null
  onSelect: (profileId: string) => void
  onCreate: (name: string, color: string) => void
  onBack?: () => void
}

export function ProfileScreen({ profiles, activeProfileId, storageWarning, onSelect, onCreate, onBack }: ProfileScreenProps) {
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState<string>(PROFILE_COLORS[0])
  const [showForm, setShowForm] = useState(profiles.length === 0)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) return
    onCreate(cleanName, selectedColor)
    setName('')
  }

  return (
    <main className="profile-page page-shell">
      <header className="brand-header profile-brand-header">
        {onBack && <button className="icon-button back-button" type="button" aria-label="Назад" onClick={onBack}>←</button>}
        <div className="brand-lockup"><span className="brand-mark">+</span><span>СТОЛБИК</span></div>
        <span className="header-note">Учим математику спокойно</span>
      </header>

      {storageWarning && <div className="storage-warning" role="status">{storageWarning}</div>}

      <section className="profile-welcome panel-card">
        <div className="welcome-owl"><Owl size={104} /></div>
        <div>
          <p className="eyebrow">МАЛЕНЬКИЕ ШАГИ — БОЛЬШИЕ ПОБЕДЫ</p>
          <h1>{profiles.length === 0 ? 'Привет, будущий математик!' : 'Кто сегодня будет считать?'}</h1>
          <p className="muted">Я БУК. Будем складывать и вычитать столбиком — без спешки и ошибок не боимся.</p>
        </div>
      </section>

      {profiles.length > 0 && (
        <section className="profile-picker-section" aria-labelledby="profiles-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ВАШИ ПРОФИЛИ</p>
              <h2 id="profiles-title">Выбери профиль</h2>
            </div>
            <span className="soft-badge">{profiles.length} {profiles.length === 1 ? 'ученик' : 'ученика'}</span>
          </div>
          <div className="profile-list">
            {profiles.map((profile) => (
              <button className={`profile-choice${profile.id === activeProfileId ? ' profile-choice-active' : ''}`} type="button" key={profile.id} onClick={() => onSelect(profile.id)}>
                <span className="profile-avatar" style={{ backgroundColor: profile.color }}><Owl size={42} accent={profile.rewards.accentColor} accessories={profile.rewards.accessoriesEquipped} /></span>
                <span className="profile-choice-copy"><strong>{profile.name}</strong><span>{profile.progress.totalSolved} примеров решено</span></span>
                <span className="profile-choice-arrow" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {showForm ? (
        <form className="create-profile-card panel-card" onSubmit={submit}>
          <div className="section-heading create-profile-heading">
            <div><p className="eyebrow">НОВОЕ ПУТЕШЕСТВИЕ</p><h2>{profiles.length === 0 ? 'Как тебя зовут?' : 'Добавить профиль'}</h2></div>
            {profiles.length > 0 && <button className="text-button" type="button" onClick={() => setShowForm(false)}>Не сейчас</button>}
          </div>
          <label className="field-label" htmlFor="child-name">Имя ребёнка</label>
          <input id="child-name" className="text-input" value={name} onChange={(event) => setName(event.target.value)} maxLength={18} placeholder="Например, Маша" autoComplete="off" required />
          <div className="color-picker-label">Выбери любимый цвет</div>
          <div className="profile-color-options" role="group" aria-label="Цвет профиля">
            {PROFILE_COLORS.map((color) => (
              <button className={`color-dot${selectedColor === color ? ' color-dot-selected' : ''}`} style={{ backgroundColor: color }} type="button" key={color} onClick={() => setSelectedColor(color)} aria-label={`Выбрать цвет ${color}`} aria-pressed={selectedColor === color} />
            ))}
          </div>
          <button className="primary-button full-width create-profile-submit" type="submit">Начать заниматься <span aria-hidden="true">→</span></button>
          <p className="form-note">Профили хранятся только на этом устройстве. Рекламы и регистрации нет.</p>
        </form>
      ) : (
        <button className="add-profile-button" type="button" onClick={() => setShowForm(true)}><span className="add-profile-plus">＋</span> Добавить профиль ребёнка</button>
      )}
      <footer className="quiet-footer">Работает офлайн · Прогресс хранится на устройстве</footer>
    </main>
  )
}
