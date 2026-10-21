import { useEffect, useState, type FormEvent } from 'react'
import { applyUpdate, checkForUpdate, isUpdateAvailable } from '../../platform/pwa'
import type { ChildProfile } from '../../state/profile'
import { Owl } from '../components/Owl'
import { ShareApp } from '../components/ShareApp'
import { plural, EXAMPLES, PUPILS } from '../plural'

declare const __APP_VERSION__: string
declare const __COMMIT_SHA__: string

const PROFILE_COLORS = ['#7762e8', '#51a99b', '#ec9a55', '#df7196', '#5389ca'] as const

interface ProfileScreenProps {
  profiles: readonly ChildProfile[]
  activeProfileId: string | null
  storageWarning: string | null
  manage?: boolean
  onSelect: (profileId: string) => void
  onCreate: (name: string, color: string) => void
  onRename?: (profileId: string, name: string, color: string) => void
  onDelete?: (profileId: string) => void
  onBack?: () => void
}

export function ProfileScreen({
  profiles,
  activeProfileId,
  storageWarning,
  manage = false,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onBack
}: ProfileScreenProps) {
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState<string>(PROFILE_COLORS[0])
  const [showForm, setShowForm] = useState(profiles.length === 0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ChildProfile | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateReady, setUpdateReady] = useState(() => isUpdateAvailable())
  const [updateNote, setUpdateNote] = useState('')

  useEffect(() => {
    const onUpdate = () => {
      setUpdateReady(true)
      setUpdateNote('Доступна новая версия приложения.')
    }
    window.addEventListener('stolbik:update', onUpdate)
    return () => window.removeEventListener('stolbik:update', onUpdate)
  }, [])

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true)
    setUpdateNote('Проверяем обновление…')
    try {
      const result = await checkForUpdate()
      if (result === 'update-ready') {
        setUpdateReady(true)
        setUpdateNote('Доступна новая версия! Нажмите «Обновить сейчас».')
      } else if (result === 'up-to-date') {
        setUpdateNote(`У вас самая свежая версия (v${__APP_VERSION__}).`)
      } else if (result === 'offline') {
        setUpdateNote('Сейчас нет интернета — проверьте обновление при подключении к сети.')
      } else {
        setUpdateNote('Не удалось проверить обновление.')
      }
    } finally {
      setCheckingUpdate(false)
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) return
    if (editingId && onRename) {
      onRename(editingId, cleanName, selectedColor)
      setEditingId(null)
      setName('')
      setShowForm(false)
      return
    }
    onCreate(cleanName, selectedColor)
    setName('')
  }

  const startEdit = (profile: ChildProfile) => {
    setEditingId(profile.id)
    setName(profile.name)
    setSelectedColor(profile.color)
    setShowForm(true)
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
            <span className="soft-badge">{plural(profiles.length, PUPILS)}</span>
          </div>
          <div className="profile-list">
            {profiles.map((profile) => (
              <div
                className={`profile-choice-row${profile.id === activeProfileId ? ' profile-choice-active' : ''}`}
                key={profile.id}
              >
                <button
                  className="profile-choice"
                  type="button"
                  onClick={() => onSelect(profile.id)}
                >
                  <span className="profile-avatar" style={{ backgroundColor: profile.color }}>
                    <Owl size={42} accent={profile.rewards.accentColor} accessories={profile.rewards.accessoriesEquipped} />
                  </span>
                  <span className="profile-choice-copy">
                    <strong>
                      {profile.name}
                      {profile.id === activeProfileId && <small className="profile-active-tag"> · выбран</small>}
                    </strong>
                    <span>{plural(profile.progress.totalSolved, EXAMPLES)} решено</span>
                  </span>
                  <span className="profile-choice-arrow" aria-hidden="true">→</span>
                </button>
                {(onRename || (manage && onDelete)) && (
                  <div className="profile-row-actions">
                    {onRename && (
                      <button
                        type="button"
                        className="profile-action-chip"
                        aria-label={`Изменить профиль ${profile.name}`}
                        title="Изменить имя и цвет"
                        onClick={() => startEdit(profile)}
                      >
                        ✏️
                      </button>
                    )}
                    {manage && onDelete && (
                      <button
                        type="button"
                        className="profile-action-chip profile-action-delete"
                        aria-label={`Удалить профиль ${profile.name}`}
                        title="Удалить профиль в корзину"
                        onClick={() => setConfirmDelete(profile)}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {showForm ? (
        <form className="create-profile-card panel-card" onSubmit={submit}>
          <div className="section-heading create-profile-heading">
            <div>
              <p className="eyebrow">{editingId ? 'РЕДАКТИРОВАНИЕ' : 'НОВОЕ ПУТЕШЕСТВИЕ'}</p>
              <h2>{editingId ? 'Изменить профиль' : profiles.length === 0 ? 'Как тебя зовут?' : 'Добавить профиль'}</h2>
            </div>
            {(profiles.length > 0 || editingId) && (
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setEditingId(null)
                  setName('')
                  setShowForm(false)
                }}
              >
                Не сейчас
              </button>
            )}
          </div>
          <label className="field-label" htmlFor="child-name">Имя ребёнка</label>
          <input id="child-name" className="text-input" value={name} onChange={(event) => setName(event.target.value)} maxLength={18} placeholder="Например, Маша" autoComplete="off" required />
          <div className="color-picker-label">Выбери любимый цвет</div>
          <div className="profile-color-options" role="group" aria-label="Цвет профиля">
            {PROFILE_COLORS.map((color) => (
              <button className={`color-dot${selectedColor === color ? ' color-dot-selected' : ''}`} style={{ backgroundColor: color }} type="button" key={color} onClick={() => setSelectedColor(color)} aria-label={`Выбрать цвет ${color}`} aria-pressed={selectedColor === color} />
            ))}
          </div>
          <button className="primary-button full-width create-profile-submit" type="submit">
            {editingId ? 'Сохранить изменения' : 'Начать заниматься'} <span aria-hidden="true">→</span>
          </button>
          <p className="form-note">Профили хранятся только на этом устройстве. Рекламы и регистрации нет.</p>
        </form>
      ) : (
        <button className="add-profile-button" type="button" onClick={() => { setEditingId(null); setName(''); setShowForm(true) }}>
          <span className="add-profile-plus">＋</span> Добавить профиль ребёнка
        </button>
      )}

      <div className="profile-share-wrap">
        <ShareApp compact />
      </div>

      {confirmDelete && onDelete && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setConfirmDelete(null)}>
          <div
            className="confirm-dialog panel-card"
            role="dialog"
            aria-modal="true"
            aria-label={`Удалить профиль ${confirmDelete.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="confirm-emoji" aria-hidden="true">🧸</div>
            <h2>Удалить профиль «{confirmDelete.name}»?</h2>
            <p className="muted">
              Профиль переместится в корзину: 30 дней его можно будет вернуть со всеми коронами и кристаллами в разделе «Родителям → Прогресс».
            </p>
            <div className="confirm-actions">
              <button type="button" className="primary-button full-width" onClick={() => setConfirmDelete(null)}>
                Оставить профиль
              </button>
              <button
                type="button"
                className="danger-button full-width"
                onClick={() => {
                  if (editingId === confirmDelete.id) {
                    setEditingId(null)
                    setName('')
                  }
                  onDelete(confirmDelete.id)
                  setConfirmDelete(null)
                }}
              >
                Удалить в корзину
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="quiet-footer profile-footer-bar">
        <span>Работает офлайн · v{__APP_VERSION__} · {__COMMIT_SHA__}</span>
        <span className="profile-footer-actions">
          {updateReady ? (
            <button type="button" className="primary-button compact-btn" onClick={() => applyUpdate()}>
              ✨ Обновить сейчас
            </button>
          ) : (
            <button
              type="button"
              className="secondary-button compact-btn"
              disabled={checkingUpdate}
              onClick={() => void handleCheckUpdate()}
            >
              {checkingUpdate ? '⏳ Проверяем…' : '🔄 Проверить обновление'}
            </button>
          )}
        </span>
        {updateNote && <p className="share-note profile-update-note" role="status">{updateNote}</p>}
      </footer>
    </main>
  )
}
