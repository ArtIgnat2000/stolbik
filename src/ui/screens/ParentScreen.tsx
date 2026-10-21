import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { LEVELS } from '../../content/levels'
import {
  agoLabel,
  EXPORT_REMINDER_MS,
  LOG_LABEL,
  type SnapshotRecord,
  type VaultLogEntry
} from '../../engine/vault'
import { downloadProfileBackup, parseBackupPayload } from '../../platform/backup'
import {
  createSnapshot,
  deleteTrashEntry,
  getBackupCount,
  loadVaultData,
  recordExportTimestamp,
  requestPersistentStorage,
  type TrashEntry
} from '../../platform/database'
import { applyUpdate, checkForUpdate, isStandalone, isUpdateAvailable } from '../../platform/pwa'
import {
  getDailyProgress,
  getHighestUnlockedLevel,
  getLevelProgress,
  type ChildProfile,
  type HintMode,
  type MascotVisibility,
  type ProfileSettings
} from '../../state/profile'
import { Owl } from '../components/Owl'
import { ShareApp } from '../components/ShareApp'
import { plural, BACKUPS, CROWNS, EXAMPLES, MISTAKES } from '../plural'

declare const __APP_VERSION__: string
declare const __COMMIT_SHA__: string

export type ParentTabId = 'overview' | 'progress' | 'settings' | 'app'

interface ParentTabItem {
  id: ParentTabId
  emoji: string
  title: string
}

export const PARENT_TABS: readonly ParentTabItem[] = [
  { id: 'overview', emoji: '📊', title: 'Обзор' },
  { id: 'progress', emoji: '💾', title: 'Прогресс' },
  { id: 'settings', emoji: '⚙️', title: 'Настройки' },
  { id: 'app', emoji: '📲', title: 'Приложение' }
] as const

interface ParentScreenProps {
  profile: ChildProfile
  allProfiles?: readonly ChildProfile[]
  activeProfileId?: string | null
  initialTab?: ParentTabId
  onBack: () => void
  onOpenProfiles?: () => void
  onOpenTopics?: () => void
  onSettingsChange: (changes: Partial<ProfileSettings>) => void
  onResetProgress: () => void
  onRestoreProfile: (profile: ChildProfile) => void
  onReplaceAllProfiles?: (profiles: ChildProfile[], activeProfileId: string | null) => Promise<void>
  onRestoreSnapshot?: (slot: number) => Promise<boolean>
  onRestoreFromTrash?: (entryId: string) => Promise<boolean>
}

const HINT_OPTIONS: readonly { value: HintMode; label: string }[] = [
  { value: 'question', label: 'Сначала наводящий вопрос, потом ответ' },
  { value: 'answer', label: 'Показывать ответ сразу' },
  { value: 'off', label: 'Выключить подсказки' }
]

const MASCOT_OPTIONS: readonly { value: MascotVisibility; label: string }[] = [
  { value: 'on', label: 'Везде (кроме урока и магазина)' },
  { value: 'home', label: 'Только на главной' },
  { value: 'off', label: 'Не показывать' }
]

const WEEKDAY_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

function lastSevenDays(): string[] {
  const result: string[] = []
  const now = new Date()
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset))
    result.push(day.toISOString().slice(0, 10))
  }
  return result
}

export function ParentScreen({
  profile,
  allProfiles,
  activeProfileId,
  initialTab = 'overview',
  onBack,
  onOpenProfiles,
  onOpenTopics,
  onSettingsChange,
  onResetProgress,
  onRestoreProfile,
  onReplaceAllProfiles,
  onRestoreSnapshot,
  onRestoreFromTrash
}: ParentScreenProps) {
  const [tab, setTab] = useState<ParentTabId>(initialTab)
  const [storageInfo, setStorageInfo] = useState('Проверяем хранилище…')
  const [backupCount, setBackupCount] = useState<number | null>(null)
  const [trash, setTrash] = useState<TrashEntry[]>([])
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([])
  const [log, setLog] = useState<VaultLogEntry[]>([])
  const [lastExportAt, setLastExportAt] = useState<number | null>(null)
  const [lastWriteAt, setLastWriteAt] = useState<number | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [notice, setNotice] = useState('')
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateReady, setUpdateReady] = useState(() => isUpdateAvailable())
  const [updateCheckStatus, setUpdateCheckStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const unlocked = getHighestUnlockedLevel(profile)

  useEffect(() => {
    const onUpdate = () => {
      setUpdateReady(true)
      setUpdateCheckStatus('Доступна новая версия! Нажмите «Обновить сейчас», чтобы применить её.')
    }
    window.addEventListener('stolbik:update', onUpdate)
    return () => window.removeEventListener('stolbik:update', onUpdate)
  }, [])

  const refreshVault = useCallback(async () => {
    try {
      const estimate = await navigator.storage?.estimate?.()
      const used = estimate?.usage
      const quota = estimate?.quota
      const format = (bytes: number) =>
        bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} КБ` : `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
      setStorageInfo(
        used !== undefined && quota !== undefined
          ? `${format(used)} из ${format(quota)} доступно`
          : 'Браузер не сообщает размер хранилища'
      )
    } catch {
      setStorageInfo('Размер хранилища недоступен')
    }
    try {
      const [count, vault] = await Promise.all([getBackupCount(), loadVaultData()])
      setBackupCount(count)
      setTrash(vault.trash)
      setSnapshots(vault.snapshots)
      setLog(vault.log)
      setLastExportAt(vault.lastExportAt)
      setLastWriteAt(vault.lastWriteAt)
      setPersisted(vault.persisted)
    } catch {
      setBackupCount(null)
    }
  }, [])

  useEffect(() => {
    void refreshVault()
  }, [profile.id, profile.progress.totalSolved, refreshVault])

  const handleExport = async () => {
    downloadProfileBackup(profile, allProfiles, activeProfileId ?? profile.id)
    try {
      const exportedAt = await recordExportTimestamp(profile.name)
      setLastExportAt(exportedAt)
      await refreshVault()
    } catch {
      /* ignore */
    }
    setNotice('Копия прогресса сохранена в файл.')
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const parsed = parseBackupPayload(await file.text())
      if (parsed.kind === 'all' && onReplaceAllProfiles) {
        if (
          !window.confirm(
            `Заменить текущий прогресс данными из файла (профилей: ${parsed.profiles.length})? Прежние профили останутся в корзине устройства.`
          )
        ) {
          return
        }
        await onReplaceAllProfiles(parsed.profiles, parsed.activeProfileId)
        setNotice('Резервная копия восстановлена. Прежние данные сохранены в корзине устройства.')
      } else {
        const imported = parsed.kind === 'single' ? parsed.profile : parsed.profiles[0]!
        if (!window.confirm(`Заменить прогресс профиля «${profile.name}» данными из файла?`)) return
        onRestoreProfile(imported)
        setNotice('Резервная копия восстановлена. Текущий прогресс перед заменой сохранён в корзине устройства.')
      }
      await refreshVault()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось прочитать резервную копию.')
    }
  }

  const handleReset = () => {
    if (
      !window.confirm(
        `Сбросить прогресс профиля «${profile.name}»? Текущий прогресс останется в корзине этого устройства на 30 дней.`
      )
    ) {
      return
    }
    onResetProgress()
    setNotice('Прогресс сброшен. Настройки профиля сохранены, а прежняя копия доступна в корзине.')
    void refreshVault()
  }

  const handleEnablePersistence = async () => {
    const granted = await requestPersistentStorage(true)
    setPersisted(granted)
    setNotice(
      granted
        ? 'Защита хранилища от автоочистки включена.'
        : 'Браузер не подтвердил постоянное хранение — рекомендуем добавить приложение на главный экран.'
    )
    await refreshVault()
  }

  const handleCreateSnapshot = async () => {
    setBusy(true)
    try {
      await createSnapshot('вручную')
      await refreshVault()
      setNotice('Снимок текущего состояния сохранён.')
    } finally {
      setBusy(false)
    }
  }

  const handleRestoreSnapshot = async (slot: number) => {
    if (!onRestoreSnapshot) return
    if (!window.confirm('Вернуть состояние из этой копии? Нынешний прогресс сохранится в корзине.')) return
    setBusy(true)
    try {
      const ok = await onRestoreSnapshot(slot)
      await refreshVault()
      setNotice(ok ? 'Состояние восстановлено из снимка.' : 'Не удалось восстановить снимок.')
    } finally {
      setBusy(false)
    }
  }

  const handleRestoreTrash = async (entry: TrashEntry) => {
    if (onRestoreFromTrash) {
      const ok = await onRestoreFromTrash(entry.id)
      await refreshVault()
      setNotice(ok ? `Профиль «${entry.profile.name}» восстановлен из корзины.` : 'Не удалось восстановить запись.')
      return
    }
    onRestoreProfile(entry.profile)
    setNotice(`Прогресс «${entry.profile.name}» восстановлен.`)
    await refreshVault()
  }

  const handleDeleteTrash = async (entry: TrashEntry) => {
    if (!window.confirm(`Удалить копию «${entry.profile.name}» из корзины окончательно?`)) return
    await deleteTrashEntry(entry.id)
    await refreshVault()
  }

  const handleCheckUpdate = async (showNotice = false) => {
    setCheckingUpdate(true)
    setUpdateCheckStatus('Проверяем наличие новой версии…')
    try {
      const status = await checkForUpdate()
      if (status === 'update-ready') {
        setUpdateReady(true)
        const msg = 'Найдено обновление! Нажмите «Обновить сейчас», чтобы применить новую версию.'
        setUpdateCheckStatus(msg)
        if (showNotice) setNotice(msg)
      } else if (status === 'up-to-date') {
        const msg = `У вас установлена актуальная версия приложения (v${__APP_VERSION__} · ${__COMMIT_SHA__}).`
        setUpdateCheckStatus(msg)
        if (showNotice) setNotice(msg)
      } else if (status === 'offline') {
        const msg = 'Сейчас нет подключения к интернету. Приложение работает офлайн; проверьте обновление, когда появится сеть.'
        setUpdateCheckStatus(msg)
        if (showNotice) setNotice(msg)
      } else {
        const msg = 'Не удалось проверить обновление — проверьте подключение к интернету.'
        setUpdateCheckStatus(msg)
        if (showNotice) setNotice(msg)
      }
    } finally {
      setCheckingUpdate(false)
    }
  }

  const updateLessonSize = (value: string) => {
    const lessonSize = Number(value)
    if (lessonSize === 3 || lessonSize === 5 || lessonSize === 8) onSettingsChange({ lessonSize })
  }

  const updateDefaultLevel = (value: string) => {
    const level = Number(value)
    if (Number.isInteger(level) && level >= 1 && level <= unlocked) {
      onSettingsChange({ defaultLevel: level as ProfileSettings['defaultLevel'] })
    }
  }

  const updateHintMode = (value: string) => {
    if (value === 'question' || value === 'answer' || value === 'off') onSettingsChange({ hintsMode: value })
  }

  const updateMascotVisibility = (value: string) => {
    if (value === 'on' || value === 'home' || value === 'off') {
      onSettingsChange({ mascotVisibility: value })
    }
  }

  const moveTab = (delta: number) => {
    const index = PARENT_TABS.findIndex((item) => item.id === tab)
    const next = PARENT_TABS[(index + delta + PARENT_TABS.length) % PARENT_TABS.length]!
    setTab(next.id)
  }

  const independentExamples = Object.values(profile.progress.levels).reduce((total, level) => total + level.cleanSolved, 0)
  const accuracy =
    profile.progress.totalSolved > 0 ? Math.round((independentExamples / profile.progress.totalSolved) * 100) : 0
  const daily = getDailyProgress(profile)
  const sevenDays = lastSevenDays()
  const activeWeekCount = sevenDays.filter((day) => profile.progress.activityDays.includes(day)).length
  const weakLevels = LEVELS.map((level) => ({
    level,
    progress: getLevelProgress(profile, level.id)
  }))
    .filter((item) => item.progress.errors > 0)
    .sort((a, b) => b.progress.errors - a.progress.errors)

  const visibleTrash = trash.slice(0, 8)
  const visibleLog = [...log].slice(-12).reverse()
  const exportOverdue = !lastExportAt || Date.now() - lastExportAt > EXPORT_REMINDER_MS

  return (
    <main className="parents-page page-shell">
      <header className="app-header parents-header">
        <button className="icon-button" type="button" aria-label="Назад домой" onClick={onBack}>
          ←
        </button>
        <div className="brand-lockup">
          <span className="brand-mark">+</span>
          <span>СТОЛБИК</span>
        </div>
        <div className="header-actions">
          {onOpenProfiles && (
            <button className="secondary-button parent-children-btn" type="button" onClick={onOpenProfiles}>
              👨‍👩‍👧 Дети
            </button>
          )}
          <span className="parent-area-label">Для взрослых</span>
        </div>
      </header>

      <div className="parent-page-intro">
        <p className="eyebrow">РОДИТЕЛЬСКИЙ РАЗДЕЛ</p>
        <h1>Прогресс и настройки</h1>
        <p>Здесь всё про занятия, сохранность прогресса, настройки и передачу ссылки на приложение.</p>
      </div>

      <section className="parent-child-card panel-card" aria-label={`Профиль ученика ${profile.name}`}>
        <span className="profile-avatar" style={{ backgroundColor: profile.color }}>
          <Owl size={44} accent={profile.rewards.accentColor} accessories={profile.rewards.accessoriesEquipped} />
        </span>
        <div className="parent-child-copy">
          <strong>{profile.name}</strong>
          <span>
            Прогресс этого профиля · с {new Date(profile.createdAt).toLocaleDateString('ru-RU')}
          </span>
        </div>
        <span className="soft-badge">Уровень {unlocked} открыт</span>
      </section>

      {notice && (
        <div className="parent-notice" role="status">
          <span>{notice}</span>
          <button type="button" aria-label="Закрыть сообщение" onClick={() => setNotice('')}>
            ×
          </button>
        </div>
      )}

      <div className="parent-seg-tabs" role="tablist" aria-label="Разделы для родителей">
        {PARENT_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`parent-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`parent-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            className={`parent-seg-tab${tab === item.id ? ' parent-seg-tab-active' : ''}`}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') {
                event.preventDefault()
                moveTab(1)
              } else if (event.key === 'ArrowLeft') {
                event.preventDefault()
                moveTab(-1)
              }
            }}
          >
            <span aria-hidden="true">{item.emoji}</span>
            <span>{item.title}</span>
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div
          id="parent-panel-overview"
          role="tabpanel"
          aria-labelledby="parent-tab-overview"
          className="parent-tab-stack"
        >
          <section className="parent-panel panel-card" aria-labelledby="today-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">СЕГОДНЯ</p>
                <h2 id="today-heading">
                  {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </h2>
              </div>
              <span className="soft-badge">Серия: {daily.currentStreak} подряд</span>
            </div>
            {daily.solvedExamples === 0 ? (
              <p className="panel-description" style={{ marginBottom: 0 }}>
                Занятий сегодня ещё не было. Можно решить 3–5 примеров в спокойном темпе.
              </p>
            ) : (
              <div className="parent-kv-list">
                <div className="parent-kv-row">
                  <span>Решено примеров сегодня</span>
                  <strong>{plural(daily.solvedExamples, EXAMPLES)}</strong>
                </div>
                <div className="parent-kv-row">
                  <span>Лучшая серия без ошибок за день</span>
                  <strong>{daily.bestStreak} подряд</strong>
                </div>
                <div className="parent-kv-row">
                  <span>Задания дня (ключи БУКа)</span>
                  <strong>🗝️ {daily.claimedTasks.length} из 3</strong>
                </div>
              </div>
            )}
          </section>

          <section className="parent-panel panel-card" aria-labelledby="week-overview-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">РИТМ НЕДЕЛИ</p>
                <h2 id="week-overview-heading">Последние 7 дней</h2>
              </div>
              <span className="soft-badge">Активных дней: {activeWeekCount} из 7</span>
            </div>
            <div className="parent-week-strip" role="group" aria-label="Активность за последние 7 дней">
              {sevenDays.map((key) => {
                const active = profile.progress.activityDays.includes(key)
                const date = new Date(`${key}T12:00:00Z`)
                const label = WEEKDAY_SHORT[date.getUTCDay()] ?? ''
                return (
                  <div className={`parent-week-col${active ? ' parent-week-col-active' : ''}`} key={key}>
                    <div className="parent-week-bar">
                      <i style={{ height: active ? '100%' : '18%' }} />
                    </div>
                    <span>{label}</span>
                    <small>{active ? '✓' : '—'}</small>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="parent-panel panel-card" aria-labelledby="stats-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ПУТЬ {profile.name.toLocaleUpperCase('ru')}</p>
                <h2 id="stats-heading">Статистика занятий</h2>
              </div>
              <span className="soft-badge">Открыто {unlocked} из 13 тем</span>
            </div>
            <div className="stats-grid">
              <div className="stat-tile">
                <span className="stat-icon" aria-hidden="true">🧮</span>
                <strong>{profile.progress.totalSolved}</strong>
                <small>примеров решено</small>
              </div>
              <div className="stat-tile">
                <span className="stat-icon" aria-hidden="true">🌱</span>
                <strong>{profile.progress.totalErrors}</strong>
                <small>ошибок — поводов учиться</small>
              </div>
              <div className="stat-tile">
                <span className="stat-icon" aria-hidden="true">⏱️</span>
                <strong>{profile.progress.practiceMinutes} мин</strong>
                <small>время занятий</small>
              </div>
              <div className="stat-tile">
                <span className="stat-icon" aria-hidden="true">💎</span>
                <strong>{profile.rewards.crystals}</strong>
                <small>кристаллов собрано</small>
              </div>
            </div>
            <div className="stats-summary">
              <span>Примеры без ошибок и подсказок с первой попытки</span>
              <strong>{accuracy}%</strong>
            </div>
            <div className="stats-track">
              <i style={{ width: `${accuracy}%` }} />
            </div>
            <div className="level-stat-list">
              {LEVELS.map((level) => {
                const progress = getLevelProgress(profile, level.id)
                return (
                  <div className="level-stat-row" key={level.id}>
                    <span className="level-stat-number">{String(level.id).padStart(2, '0')}</span>
                    <span className="level-stat-title">{level.shortTitle}</span>
                    <span className="level-stat-count">{progress.solved} решено</span>
                    <span className="level-stat-errors">{plural(progress.errors, MISTAKES)}</span>
                    <span className="level-stat-crowns" aria-label={`${plural(progress.crowns, CROWNS)} из 3`}>
                      {'♛'.repeat(progress.crowns)}
                      <span>{'♛'.repeat(3 - progress.crowns)}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="parent-panel panel-card" aria-labelledby="weak-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">НА ЧТО ОБРАТИТЬ ВНИМАНИЕ</p>
                <h2 id="weak-heading">Что подтянуть</h2>
              </div>
            </div>
            {weakLevels.length > 0 ? (
              <>
                <div className="weak-topic-list">
                  {weakLevels.map(({ level, progress }) => (
                    <span className="weak-topic-chip" key={level.id}>
                      Тема {level.id}: {level.shortTitle} · {plural(progress.errors, MISTAKES)}
                    </span>
                  ))}
                </div>
                <p className="panel-description" style={{ marginTop: 12, marginBottom: onOpenTopics ? 12 : 0 }}>
                  Эти темы можно разобрать вместе в справочнике или пройти ещё раз с наглядной моделью разрядов.
                </p>
              </>
            ) : (
              <p className="panel-description" style={{ marginBottom: onOpenTopics ? 12 : 0 }}>
                Трудных тем с ошибками пока нет — отличная работа!
              </p>
            )}
            {onOpenTopics && (
              <button type="button" className="secondary-button full-width" onClick={onOpenTopics}>
                Посмотреть все темы в справочнике 📖
              </button>
            )}
          </section>

          <div className="parent-quick-actions parent-quick-actions-three">
            <button type="button" className="secondary-button" onClick={() => setTab('progress')}>
              💾 Сделать копию
            </button>
            <button type="button" className="secondary-button" onClick={() => setTab('app')}>
              📲 Передать ссылку
            </button>
            {updateReady ? (
              <button type="button" className="primary-button" onClick={() => applyUpdate()}>
                ✨ Обновить сейчас
              </button>
            ) : (
              <button
                type="button"
                className="secondary-button"
                disabled={checkingUpdate}
                onClick={() => void handleCheckUpdate(true)}
              >
                {checkingUpdate ? '⏳ Проверяем…' : '🔄 Проверить обновление'}
              </button>
            )}
          </div>
        </div>
      )}

      {tab === 'progress' && (
        <div
          id="parent-panel-progress"
          role="tabpanel"
          aria-labelledby="parent-tab-progress"
          className="parent-tab-stack"
        >
          <section className="parent-panel backup-panel panel-card" aria-labelledby="backup-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ДАННЫЕ ОСТАЮТСЯ ВАШИМИ</p>
                <h2 id="backup-heading">Резервная копия</h2>
              </div>
              <span className="backup-icon" aria-hidden="true">🛡️</span>
            </div>
            <p className="panel-description">
              Сохраните файл, чтобы перенести прогресс на другое устройство или вернуть всё назад.
            </p>
            <div className="backup-actions">
              <button className="secondary-button" type="button" onClick={() => void handleExport()}>
                Скачать копию <span aria-hidden="true">↓</span>
              </button>
              <button className="secondary-button" type="button" onClick={() => fileInput.current?.click()}>
                Восстановить из файла <span aria-hidden="true">↑</span>
              </button>
              <input
                className="visually-hidden"
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                onChange={handleImport}
                aria-label="Выбрать резервную копию"
              />
            </div>
            <div className="parent-kv-list" style={{ marginTop: 14 }}>
              <div className="parent-kv-row">
                <span>Последняя выгрузка в файл</span>
                <span>{lastExportAt ? agoLabel(lastExportAt) : 'ни разу не делали'}</span>
              </div>
            </div>
            {exportOverdue && (
              <div className="storage-warning" style={{ marginTop: 12, marginBottom: 0 }}>
                <span>
                  💾 <strong>Сделайте копию прогресса.</strong> Прогресс хранится только на этом устройстве: с файлом его легко перенести или восстановить.
                </span>
              </div>
            )}
          </section>

          <section className="parent-panel panel-card" aria-labelledby="health-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">НАДЁЖНОСТЬ ХРАНЕНИЯ</p>
                <h2 id="health-heading">Сохранность на устройстве</h2>
              </div>
            </div>
            <div className="parent-kv-list">
              <div className="parent-kv-row">
                <span>Статус сохранения</span>
                <strong className="health-ok">работает ✓</strong>
              </div>
              <div className="parent-kv-row">
                <span>Последняя запись</span>
                <span>{lastWriteAt ? agoLabel(lastWriteAt) : 'только что'}</span>
              </div>
              <div className="parent-kv-row">
                <span>Хранилище устройства</span>
                <span>{storageInfo}</span>
              </div>
              <div className="parent-kv-row">
                <span>Локальные резервные копии</span>
                <span>{backupCount === null ? 'Недоступны' : plural(backupCount, BACKUPS)}</span>
              </div>
              <div className="parent-kv-row">
                <span>Защита от автоочистки браузером</span>
                {persisted === true ? (
                  <strong>включена</strong>
                ) : (
                  <button type="button" className="secondary-button compact-btn" onClick={() => void handleEnablePersistence()}>
                    Включить
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="parent-panel panel-card" aria-labelledby="snapshots-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ТОЧКИ ОТКАТА</p>
                <h2 id="snapshots-heading">Вернуть как было</h2>
              </div>
              <button
                type="button"
                className="secondary-button compact-btn"
                disabled={busy}
                onClick={() => void handleCreateSnapshot()}
              >
                + Сделать снимок
              </button>
            </div>
            <p className="panel-description">
              Приложение автоматически сохраняет до трёх снимков состояния перед важными изменениями и во время занятий.
            </p>
            {snapshots.length === 0 ? (
              <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
                Автоматических снимков пока нет — они появятся по мере занятий или по кнопке «+ Сделать снимок».
              </p>
            ) : (
              <div className="parent-kv-list">
                {snapshots.map((snap) => (
                  <div className="parent-kv-row" key={snap.slot}>
                    <span>
                      <strong>Слот #{snap.slot}</strong> · {agoLabel(snap.at)} · профилей: {snap.profiles.length} (решено: {snap.totalSolved})
                    </span>
                    {onRestoreSnapshot && (
                      <button
                        type="button"
                        className="secondary-button compact-btn"
                        disabled={busy}
                        onClick={() => void handleRestoreSnapshot(snap.slot)}
                      >
                        Вернуть
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {visibleTrash.length > 0 && (
            <section className="parent-panel panel-card" aria-labelledby="trash-heading">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">КОРЗИНА (30 ДНЕЙ)</p>
                  <h2 id="trash-heading">Предыдущие версии и удалённые профили</h2>
                </div>
              </div>
              <div className="parent-kv-list">
                {visibleTrash.map((item) => (
                  <div className="parent-kv-row" key={item.id}>
                    <span>
                      <strong>{item.profile.name}</strong> · {agoLabel(item.deletedAt)} ·{' '}
                      {plural(item.profile.progress.totalSolved, EXAMPLES)} · 💎 {item.profile.rewards.crystals}
                    </span>
                    <span className="parent-row-btns">
                      <button
                        type="button"
                        className="secondary-button compact-btn"
                        onClick={() => void handleRestoreTrash(item)}
                      >
                        Вернуть
                      </button>
                      <button
                        type="button"
                        className="profile-action-chip profile-action-delete"
                        aria-label={`Удалить копию ${item.profile.name} окончательно`}
                        onClick={() => void handleDeleteTrash(item)}
                      >
                        🗑
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {visibleLog.length > 0 && (
            <section className="parent-panel panel-card" aria-label="Журнал событий">
              <details className="vault-log-details">
                <summary className="vault-log-summary">Журнал: что происходило с прогрессом ({visibleLog.length})</summary>
                <div className="parent-kv-list" style={{ marginTop: 12 }}>
                  {visibleLog.map((entry, idx) => (
                    <div className="parent-kv-row" key={`${entry.at}-${idx}`}>
                      <span>{new Date(entry.at).toLocaleString('ru-RU')}</span>
                      <span>
                        {LOG_LABEL[entry.kind] ?? entry.kind}
                        {entry.note ? ` · ${entry.note}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            </section>
          )}

          <section className="parent-panel panel-card danger-zone-card" aria-labelledby="reset-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ОСТОРОЖНОЕ ДЕЙСТВИЕ</p>
                <h2 id="reset-heading">Начать заново</h2>
              </div>
            </div>
            <p className="panel-description">
              Сброс обнулит решённые примеры, короны и кристаллы профиля «{profile.name}». Текущий прогресс сохранится в корзине на 30 дней.
            </p>
            <button className="danger-button" type="button" onClick={handleReset}>
              Сбросить прогресс профиля
            </button>
          </section>
        </div>
      )}

      {tab === 'settings' && (
        <div
          id="parent-panel-settings"
          role="tabpanel"
          aria-labelledby="parent-tab-settings"
          className="parent-tab-stack"
        >
          <section className="parent-panel panel-card" aria-labelledby="settings-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ПОД ВАШУ СЕМЬЮ</p>
                <h2 id="settings-heading">Настройки занятий</h2>
              </div>
            </div>
            <div className="settings-list">
              <label className="settings-row">
                <span>
                  <strong>Примеров в уроке</strong>
                  <small>Урок можно закончить в любой момент</small>
                </span>
                <select
                  className="select-input"
                  value={profile.settings.lessonSize}
                  onChange={(event) => updateLessonSize(event.target.value)}
                >
                  <option value="3">3 примера</option>
                  <option value="5">5 примеров</option>
                  <option value="8">8 примеров</option>
                </select>
              </label>
              <label className="settings-row">
                <span>
                  <strong>Уровень по умолчанию</strong>
                  <small>Не выше уже открытого уровня</small>
                </span>
                <select
                  className="select-input"
                  value={Math.min(profile.settings.defaultLevel, unlocked)}
                  onChange={(event) => updateDefaultLevel(event.target.value)}
                >
                  {Array.from({ length: unlocked }, (_, index) => index + 1).map((level) => (
                    <option value={level} key={level}>
                      Уровень {level}
                    </option>
                  ))}
                </select>
              </label>
              <label className="settings-row">
                <span>
                  <strong>Подсказки БУКа</strong>
                  <small>Всегда можно вернуться к обычному режиму</small>
                </span>
                <select
                  className="select-input hint-select"
                  value={profile.settings.hintsMode}
                  onChange={(event) => updateHintMode(event.target.value)}
                >
                  {HINT_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="settings-row">
                <span>
                  <strong>Физическая клавиатура</strong>
                  <small>Не нужна для урока, можно включить по желанию</small>
                </span>
                <input
                  className="toggle-input"
                  type="checkbox"
                  checked={profile.settings.keyboardEnabled}
                  onChange={(event) => onSettingsChange({ keyboardEnabled: event.target.checked })}
                  aria-label="Физическая клавиатура"
                />
              </label>
            </div>
          </section>

          <section className="parent-panel panel-card" aria-labelledby="sound-settings-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ЗВУК И ОТКЛИК</p>
                <h2 id="sound-settings-heading">Аудио и тактильный отклик</h2>
              </div>
            </div>
            <div className="settings-list">
              <label className="settings-row">
                <span>
                  <strong>Мягкие звуки</strong>
                  <small>Звуки создаются прямо в браузере — офлайн</small>
                </span>
                <input
                  className="toggle-input"
                  type="checkbox"
                  checked={profile.settings.soundEnabled}
                  onChange={(event) => onSettingsChange({ soundEnabled: event.target.checked })}
                  aria-label="Мягкие звуки"
                />
              </label>
              <label className="settings-row">
                <span>
                  <strong>Короткая вибрация</strong>
                  <small>Только при правильном ответе и награде</small>
                </span>
                <input
                  className="toggle-input"
                  type="checkbox"
                  checked={profile.settings.hapticsEnabled}
                  onChange={(event) => onSettingsChange({ hapticsEnabled: event.target.checked })}
                  aria-label="Короткая вибрация"
                />
              </label>
            </div>
          </section>

          <section className="parent-panel panel-card" aria-labelledby="view-settings-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ВИД ПРИЛОЖЕНИЯ</p>
                <h2 id="view-settings-heading">Помощник на экране</h2>
              </div>
            </div>
            <div className="settings-list">
              <label className="settings-row">
                <span>
                  <strong>Сова БУК в углу экрана</strong>
                  <small>Плавающий помощник с поддержкой и подсказками</small>
                </span>
                <select
                  className="select-input hint-select"
                  value={profile.settings.mascotVisibility ?? 'on'}
                  onChange={(event) => updateMascotVisibility(event.target.value)}
                >
                  {MASCOT_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        </div>
      )}

      {tab === 'app' && (
        <div
          id="parent-panel-app"
          role="tabpanel"
          aria-labelledby="parent-tab-app"
          className="parent-tab-stack"
        >
          <ShareApp />

          <section className="parent-panel panel-card" aria-labelledby="update-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">АВТОМАТИЧЕСКОЕ И РУЧНОЕ ОБНОВЛЕНИЕ</p>
                <h2 id="update-heading">Обновление программы</h2>
              </div>
              <span className="soft-badge">v{__APP_VERSION__} · {__COMMIT_SHA__}</span>
            </div>
            <p className="panel-description">
              Приложение проверяет обновления само при запуске и возвращении на экран, но вы всегда можете проверить наличие свежей версии вручную.
            </p>
            <div className="backup-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={checkingUpdate}
                onClick={() => void handleCheckUpdate(false)}
              >
                {checkingUpdate ? '⏳ Проверяем…' : '🔄 Проверить обновление'}
              </button>
              {updateReady && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => applyUpdate()}
                >
                  ✨ Обновить сейчас
                </button>
              )}
            </div>
            {updateCheckStatus && (
              <p className="share-note" role="status" style={{ marginTop: 12, marginBottom: 0 }}>
                {updateCheckStatus}
              </p>
            )}
          </section>

          <section className="parent-panel panel-card" aria-labelledby="install-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">РАБОТА БЕЗ ИНТЕРНЕТА</p>
                <h2 id="install-heading">На телефон или планшет</h2>
              </div>
            </div>
            {isStandalone() ? (
              <p className="panel-description" style={{ marginBottom: 0 }}>
                ✅ Приложение уже открыто с экрана «Домой» — интернет для занятий не нужен.
              </p>
            ) : (
              <p className="panel-description" style={{ marginBottom: 0 }}>
                📲 В браузере нажмите «Поделиться» → «На экран Домой» (на Android — «Установить приложение»). После этого «Столбик» открывается как обычное приложение и работает без интернета.
              </p>
            )}
          </section>

          <section className="diagnostics-card" aria-labelledby="diagnostics-heading">
            <div className="section-heading" style={{ marginBottom: 8 }}>
              <div>
                <p className="eyebrow">ТЕХНИЧЕСКАЯ ИНФОРМАЦИЯ</p>
                <h2 id="diagnostics-heading">Диагностика</h2>
              </div>
            </div>
            <dl>
              <div>
                <dt>Версия</dt>
                <dd>{__APP_VERSION__} · {__COMMIT_SHA__}</dd>
              </div>
              <div>
                <dt>Хранилище устройства</dt>
                <dd>{storageInfo}</dd>
              </div>
              <div>
                <dt>Локальные резервные копии</dt>
                <dd>{backupCount === null ? 'Недоступны' : plural(backupCount, BACKUPS)}</dd>
              </div>
              <div>
                <dt>Подключение к интернету</dt>
                <dd>Для занятий не требуется</dd>
              </div>
            </dl>
          </section>
        </div>
      )}

      <footer className="app-footer">Столбик — спокойное обучение без рекламы и подписок.</footer>
    </main>
  )
}
