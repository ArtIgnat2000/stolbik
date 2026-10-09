import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { LEVELS } from '../../content/levels'
import { getBackupCount } from '../../platform/database'
import { downloadProfileBackup, parseProfileBackup } from '../../platform/backup'
import { getHighestUnlockedLevel, getLevelProgress, type ChildProfile, type HintMode, type ProfileSettings } from '../../state/profile'
import { plural, BACKUPS, CROWNS, MISTAKES } from '../plural'

declare const __APP_VERSION__: string
declare const __COMMIT_SHA__: string

interface ParentScreenProps {
  profile: ChildProfile
  onBack: () => void
  onSettingsChange: (changes: Partial<ProfileSettings>) => void
  onResetProgress: () => void
  onRestoreProfile: (profile: ChildProfile) => void
}

const HINT_OPTIONS: readonly { value: HintMode; label: string }[] = [
  { value: 'question', label: 'Сначала наводящий вопрос, потом ответ' },
  { value: 'answer', label: 'Показывать ответ сразу' },
  { value: 'off', label: 'Выключить подсказки' }
]

export function ParentScreen({ profile, onBack, onSettingsChange, onResetProgress, onRestoreProfile }: ParentScreenProps) {
  const [storageInfo, setStorageInfo] = useState('Проверяем хранилище…')
  const [backupCount, setBackupCount] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const unlocked = getHighestUnlockedLevel(profile)

  useEffect(() => {
    let cancelled = false
    const updateStorageInfo = async () => {
      try {
        const estimate = await navigator.storage?.estimate?.()
        const used = estimate?.usage
        const quota = estimate?.quota
        const format = (bytes: number) => bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} КБ` : `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
        if (!cancelled) setStorageInfo(used !== undefined && quota !== undefined ? `${format(used)} из ${format(quota)} доступно` : 'Браузер не сообщает размер хранилища')
      } catch {
        if (!cancelled) setStorageInfo('Размер хранилища недоступен')
      }
      try {
        const count = await getBackupCount()
        if (!cancelled) setBackupCount(count)
      } catch {
        if (!cancelled) setBackupCount(null)
      }
    }
    void updateStorageInfo()
    return () => { cancelled = true }
  }, [profile.id])

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const imported = parseProfileBackup(await file.text())
      if (!window.confirm(`Заменить прогресс профиля «${profile.name}» данными из файла?`)) return
      onRestoreProfile(imported)
      setNotice('Резервная копия восстановлена. Текущий прогресс перед заменой сохранён в корзине устройства.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось прочитать резервную копию.')
    }
  }

  const handleReset = () => {
    if (!window.confirm(`Сбросить прогресс профиля «${profile.name}»? Текущий прогресс останется в корзине этого устройства.`)) return
    onResetProgress()
    setNotice('Прогресс сброшен. Настройки профиля сохранены.')
  }

  const updateLessonSize = (value: string) => {
    const lessonSize = Number(value)
    if (lessonSize === 3 || lessonSize === 5 || lessonSize === 8) onSettingsChange({ lessonSize })
  }

  const updateDefaultLevel = (value: string) => {
    const level = Number(value)
    if (Number.isInteger(level) && level >= 1 && level <= unlocked) onSettingsChange({ defaultLevel: level as ProfileSettings['defaultLevel'] })
  }

  const updateHintMode = (value: string) => {
    if (value === 'question' || value === 'answer' || value === 'off') onSettingsChange({ hintsMode: value })
  }

  const independentExamples = Object.values(profile.progress.levels).reduce((total, level) => total + level.cleanSolved, 0)
  const accuracy = profile.progress.totalSolved > 0
    ? Math.round(independentExamples / profile.progress.totalSolved * 100)
    : 0

  return (
    <main className="parents-page page-shell">
      <header className="app-header parents-header">
        <button className="icon-button" type="button" aria-label="Назад домой" onClick={onBack}>←</button>
        <div className="brand-lockup"><span className="brand-mark">+</span><span>СТОЛБИК</span></div>
        <span className="parent-area-label">Для взрослых</span>
      </header>

      <div className="parent-page-intro"><p className="eyebrow">РОДИТЕЛЬСКИЙ РАЗДЕЛ</p><h1>Прогресс и настройки</h1><p>Всё спокойно: здесь можно посмотреть занятия, настроить подсказки или сделать резервную копию.</p></div>
      {notice && <div className="parent-notice" role="status"><span>{notice}</span><button type="button" aria-label="Закрыть сообщение" onClick={() => setNotice('')}>×</button></div>}

      <section className="parent-panel panel-card" aria-labelledby="stats-heading">
        <div className="section-heading"><div><p className="eyebrow">ПУТЬ {profile.name.toLocaleUpperCase('ru')}</p><h2 id="stats-heading">Статистика занятий</h2></div><span className="soft-badge">Уровень {unlocked} открыт</span></div>
        <div className="stats-grid">
          <div className="stat-tile"><span className="stat-icon" aria-hidden="true">🧮</span><strong>{profile.progress.totalSolved}</strong><small>примеров решено</small></div>
          <div className="stat-tile"><span className="stat-icon" aria-hidden="true">🌱</span><strong>{profile.progress.totalErrors}</strong><small>ошибок — поводов учиться</small></div>
          <div className="stat-tile"><span className="stat-icon" aria-hidden="true">⏱️</span><strong>{profile.progress.practiceMinutes} мин</strong><small>время занятий</small></div>
          <div className="stat-tile"><span className="stat-icon" aria-hidden="true">💎</span><strong>{profile.rewards.crystals}</strong><small>кристаллов собрано</small></div>
        </div>
        <div className="stats-summary"><span>Примеры без ошибок и подсказок с первой попытки</span><strong>{accuracy}%</strong></div>
        <div className="stats-track"><i style={{ width: `${accuracy}%` }} /></div>
        <div className="level-stat-list">
          {LEVELS.map((level) => {
            const progress = getLevelProgress(profile, level.id)
            return <div className="level-stat-row" key={level.id}><span className="level-stat-number">{String(level.id).padStart(2, '0')}</span><span className="level-stat-title">{level.shortTitle}</span><span className="level-stat-count">{progress.solved} решено</span><span className="level-stat-errors">{plural(progress.errors, MISTAKES)}</span><span className="level-stat-crowns" aria-label={`${plural(progress.crowns, CROWNS)} из 3`}>{'♛'.repeat(progress.crowns)}<span>{'♛'.repeat(3 - progress.crowns)}</span></span></div>
          })}
        </div>
      </section>

      <section className="parent-panel panel-card" aria-labelledby="settings-heading">
        <div className="section-heading"><div><p className="eyebrow">ПОД ВАШУ СЕМЬЮ</p><h2 id="settings-heading">Настройки занятий</h2></div></div>
        <div className="settings-list">
          <label className="settings-row"><span><strong>Примеров в уроке</strong><small>Урок можно закончить в любой момент</small></span><select className="select-input" value={profile.settings.lessonSize} onChange={(event) => updateLessonSize(event.target.value)}><option value="3">3 примера</option><option value="5">5 примеров</option><option value="8">8 примеров</option></select></label>
          <label className="settings-row"><span><strong>Уровень по умолчанию</strong><small>Не выше уже открытого уровня</small></span><select className="select-input" value={Math.min(profile.settings.defaultLevel, unlocked)} onChange={(event) => updateDefaultLevel(event.target.value)}>{Array.from({ length: unlocked }, (_, index) => index + 1).map((level) => <option value={level} key={level}>Уровень {level}</option>)}</select></label>
          <label className="settings-row"><span><strong>Подсказки БУКа</strong><small>Всегда можно вернуться к обычному режиму</small></span><select className="select-input hint-select" value={profile.settings.hintsMode} onChange={(event) => updateHintMode(event.target.value)}>{HINT_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
          <label className="settings-row"><span><strong>Мягкие звуки</strong><small>Звуки создаются прямо в браузере — офлайн</small></span><input className="toggle-input" type="checkbox" checked={profile.settings.soundEnabled} onChange={(event) => onSettingsChange({ soundEnabled: event.target.checked })} aria-label="Мягкие звуки" /></label>
          <label className="settings-row"><span><strong>Короткая вибрация</strong><small>Только при правильном ответе и награде</small></span><input className="toggle-input" type="checkbox" checked={profile.settings.hapticsEnabled} onChange={(event) => onSettingsChange({ hapticsEnabled: event.target.checked })} aria-label="Короткая вибрация" /></label>
          <label className="settings-row"><span><strong>Физическая клавиатура</strong><small>Не нужна для урока, можно включить по желанию</small></span><input className="toggle-input" type="checkbox" checked={profile.settings.keyboardEnabled} onChange={(event) => onSettingsChange({ keyboardEnabled: event.target.checked })} aria-label="Физическая клавиатура" /></label>
        </div>
      </section>

      <section className="parent-panel backup-panel panel-card" aria-labelledby="backup-heading">
        <div className="section-heading"><div><p className="eyebrow">ДАННЫЕ ОСТАЮТСЯ ВАШИМИ</p><h2 id="backup-heading">Резервная копия</h2></div><span className="backup-icon" aria-hidden="true">🛡️</span></div>
        <p className="panel-description">Сохраните файл, чтобы перенести прогресс на другое устройство. Перед изменениями приложение держит последние версии профиля в локальной корзине.</p>
        <div className="backup-actions"><button className="secondary-button" type="button" onClick={() => downloadProfileBackup(profile)}>Скачать копию <span aria-hidden="true">↓</span></button><button className="secondary-button" type="button" onClick={() => fileInput.current?.click()}>Восстановить из файла <span aria-hidden="true">↑</span></button><input className="visually-hidden" ref={fileInput} type="file" accept="application/json,.json" onChange={handleImport} aria-label="Выбрать резервную копию" /></div>
        <button className="danger-text-button" type="button" onClick={handleReset}>Сбросить прогресс профиля</button>
      </section>

      <section className="diagnostics-card" aria-labelledby="diagnostics-heading">
        <div><p className="eyebrow">ТЕХНИЧЕСКАЯ ИНФОРМАЦИЯ</p><h2 id="diagnostics-heading">Диагностика</h2></div>
        <dl><div><dt>Версия</dt><dd>{__APP_VERSION__} · {__COMMIT_SHA__}</dd></div><div><dt>Хранилище устройства</dt><dd>{storageInfo}</dd></div><div><dt>Локальные резервные копии</dt><dd>{backupCount === null ? 'Недоступны' : plural(backupCount, BACKUPS)}</dd></div><div><dt>Подключение к интернету</dt><dd>Для занятий не требуется</dd></div></dl>
      </section>
      <footer className="app-footer">Столбик — спокойное обучение без рекламы и подписок.</footer>
    </main>
  )
}
