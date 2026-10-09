import { getLevelInfo, LEVELS, type LevelId } from '../../content/levels'
import { getDailyProgress, getHighestUnlockedLevel, getLevelProgress, type ChildProfile } from '../../state/profile'
import { getDailyTaskState } from '../../state/store'
import { FloatingOwl } from '../components/FloatingOwl'
import { Owl } from '../components/Owl'

interface HomeScreenProps {
  profile: ChildProfile
  storageWarning: string | null
  onStartLesson: (levelId: LevelId) => void
  onOpenProfiles: () => void
  onOpenParents: () => void
  onOpenShop: () => void
  onClaimTask: (taskId: 'examples' | 'streak' | 'level') => void
  onClaimChest: () => void
  onDismissWarning: () => void
}

const TASKS = [
  { id: 'examples', title: 'Реши 5 примеров', detail: 'Каждый шаг — уже успех', icon: '✏️' },
  { id: 'streak', title: '3 правильных подряд', detail: 'Не обязательно спешить', icon: '🌟' },
  { id: 'level', title: 'Открой 10-й уровень', detail: 'Постепенно, уровень за уровнем', icon: '🗝️' }
] as const

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 11) return 'Доброе утро'
  if (hour < 17) return 'Добрый день'
  return 'Добрый вечер'
}

function growthTitle(level: number): string {
  if (level >= 13) return 'Магистр математики'
  if (level >= 9) return 'Мудрая сова'
  if (level >= 5) return 'Сова-исследователь'
  return 'Совёнок-ученик'
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function WeekStrip({ profile }: { profile: ChildProfile }) {
  const names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const today = new Date()
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const mondayIndex = (todayUtc.getUTCDay() + 6) % 7
  const monday = new Date(todayUtc)
  monday.setUTCDate(todayUtc.getUTCDate() - mondayIndex)
  const days = names.map((name, index) => {
    const date = new Date(monday)
    date.setUTCDate(monday.getUTCDate() + index)
    const key = dateKey(date)
    return { name, key, active: profile.progress.activityDays.includes(key), today: key === dateKey(todayUtc) }
  })
  const activeCount = days.filter((day) => day.active).length
  const rewardText = activeCount >= 7 ? 'Все награды недели собраны 🎉' : activeCount >= 5 ? '7 дней = ещё 8 💎' : activeCount >= 3 ? '5 дней = ещё 5 💎' : '3 дня = +3 💎'
  return (
    <section className="week-card panel-card" aria-labelledby="week-title">
      <div className="week-heading">
        <div><p className="eyebrow">ТВОЙ РИТМ</p><h2 id="week-title">Неделя занятий</h2></div>
        <span className="week-kindness">{activeCount}/7 · {rewardText}</span>
      </div>
      <div className="week-days" aria-label="Занятия за эту неделю">
        {days.map((day) => <div className={`week-day${day.active ? ' week-day-active' : ''}${day.today ? ' week-day-today' : ''}`} key={day.key} aria-label={`${day.name}${day.active ? ', занимался' : ', без занятия'}`}>
          <span>{day.name}</span><i aria-hidden="true">{day.active ? '✓' : day.today ? '·' : ''}</i>
        </div>)}
      </div>
    </section>
  )
}

export function HomeScreen({
  profile,
  storageWarning,
  onStartLesson,
  onOpenProfiles,
  onOpenParents,
  onOpenShop,
  onClaimTask,
  onClaimChest,
  onDismissWarning
}: HomeScreenProps) {
  const unlocked = getHighestUnlockedLevel(profile)
  const continueLevel = Math.min(profile.settings.defaultLevel, unlocked) as LevelId
  const daily = getDailyProgress(profile)
  const claimedCount = daily.claimedTasks.length
  const heroLevel = getLevelInfo(continueLevel)

  return (
    <main className="home-page page-shell">
      <header className="app-header">
        <button className="brand-lockup brand-button" type="button" aria-label="Главная" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="brand-mark">+</span><span>СТОЛБИК</span>
        </button>
        <div className="header-actions">
          <button className="crystal-pill" type="button" onClick={onOpenShop} aria-label={`Кристаллов: ${profile.rewards.crystals}. Открыть магазин`}><span aria-hidden="true">💎</span> {profile.rewards.crystals}</button>
          <button className="profile-pill" type="button" onClick={onOpenProfiles} aria-label={`Профиль ${profile.name}, сменить профиль`}>
            <span className="tiny-avatar" style={{ backgroundColor: profile.color }}><Owl size={32} accent={profile.rewards.accentColor} accessories={profile.rewards.accessoriesEquipped} /></span>
            <span>{profile.name}</span><span aria-hidden="true">⌄</span>
          </button>
          <button className="icon-button parent-icon" type="button" onClick={onOpenParents} aria-label="Родительский раздел">⚙</button>
        </div>
      </header>

      {storageWarning && <div className="storage-warning home-storage-warning" role="status"><span>{storageWarning}</span><button className="storage-warning-close" type="button" aria-label="Скрыть сообщение" onClick={onDismissWarning}>×</button></div>}

      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-kicker">{greeting()}, {profile.name}!</span>
          <h1>Считаем шаг за шагом</h1>
          <p>Ошибки — это подсказки. БУК поможет разобраться в каждом примере.</p>
          <button className="hero-cta" type="button" onClick={() => onStartLesson(continueLevel)}>
            <span className="hero-cta-label">Продолжить обучение</span><span className="hero-cta-detail">Уровень {continueLevel} · {heroLevel.shortTitle}</span><span className="hero-cta-arrow" aria-hidden="true">→</span>
          </button>
        </div>
        <div className="hero-owl-wrap">
          <div className="hero-spark spark-one">✦</div><div className="hero-spark spark-two">✧</div>
          <Owl size={170} accent={profile.rewards.accentColor} accessories={profile.rewards.accessoriesEquipped} />
          <span className="growth-label">{growthTitle(unlocked)}</span>
        </div>
        <div className="hero-decoration hero-decoration-one" /><div className="hero-decoration hero-decoration-two" />
      </section>

      <div className="home-main-grid">
        <div className="home-left-column">
          <section className="section-block levels-block" aria-labelledby="levels-heading">
            <div className="section-heading">
              <div><p className="eyebrow">МОДУЛЬ ПО МЕТОДИКЕ</p><h2 id="levels-heading">Сложение и вычитание столбиком</h2><p className="course-scope-note">13 тем — от двузначных действий к трёхзначным. Это раздел тренажёра, а не весь курс математики за 2 класс.</p></div>
              <span className="progress-count">Открыто {unlocked} из 13</span>
            </div>
            <div className="level-list">
              {LEVELS.map((level) => {
                const levelProgress = getLevelProgress(profile, level.id)
                const isUnlocked = level.id <= unlocked
                return (
                  <button
                    className={`level-card${isUnlocked ? '' : ' level-card-locked'}${level.id === unlocked ? ' level-card-next' : ''}`}
                    type="button"
                    key={level.id}
                    disabled={!isUnlocked}
                    onClick={() => onStartLesson(level.id)}
                    aria-label={`${isUnlocked ? 'Начать' : 'Закрытый уровень'} ${level.id}: ${level.title}, корон ${levelProgress.crowns} из 3`}
                  >
                    <span className={`level-number${level.operation === 'subtract' ? ' level-number-subtract' : ''}${level.operation === 'mixed' ? ' level-number-mixed' : ''}`}>
                      {level.operation === 'add' ? '+' : level.operation === 'subtract' ? '−' : '±'}
                      <small>{String(level.id).padStart(2, '0')}</small>
                    </span>
                    <span className="level-copy"><strong>{level.shortTitle}</strong><span>{level.description}</span><span className="level-example">{level.example}{level.operation !== 'mixed' ? ' =' : ''}</span></span>
                    <span className="level-end">
                      <span className="crowns" aria-label={`${levelProgress.crowns} короны из 3`}>{[1, 2, 3].map((crown) => <span className={crown <= levelProgress.crowns ? 'crown crown-earned' : 'crown'} key={crown}>♛</span>)}</span>
                      <span className="level-arrow" aria-hidden="true">{isUnlocked ? '→' : '🔒'}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        <aside className="home-right-column">
          <WeekStrip profile={profile} />
          <section className="daily-card panel-card" aria-labelledby="daily-heading">
            <div className="section-heading daily-section-heading">
              <div><p className="eyebrow">МАЛЕНЬКИЕ МИССИИ</p><h2 id="daily-heading">Задания на сегодня</h2></div>
              <span className="key-counter" aria-label={`${claimedCount} ключа из 3`}>🗝️ {claimedCount}/3</span>
            </div>
            <div className="daily-task-list">
              {TASKS.map((task) => {
                const state = getDailyTaskState(profile, task.id)
                const progress = Math.min(state.progress, state.goal)
                return (
                  <article className="daily-task" key={task.id}>
                    <span className="task-icon" aria-hidden="true">{task.icon}</span>
                    <div className="task-copy"><strong>{task.title}</strong><span>{task.detail}</span><div className="task-progress-track"><i style={{ width: `${Math.max(0, Math.min(100, progress / state.goal * 100))}%` }} /></div><small>{progress} / {state.goal}</small></div>
                    {state.claimed ? <span className="task-done" aria-label="Награда получена">✓</span> : state.complete ? <button className="task-claim-button" type="button" onClick={() => onClaimTask(task.id)}>Забрать<br /><small>+3 💎</small></button> : <span className="task-lock" aria-hidden="true">· · ·</span>}
                  </article>
                )
              })}
            </div>
            {claimedCount >= 3 ? (
              <button className={`daily-chest-button${daily.chestClaimed ? ' daily-chest-opened' : ''}`} type="button" disabled={daily.chestClaimed} onClick={onClaimChest}>
                <span aria-hidden="true">{daily.chestClaimed ? '🎉' : '🎁'}</span>
                <span><strong>{daily.chestClaimed ? 'Сундук открыт!' : 'Сундук БУКа готов'}</strong><small>{daily.chestClaimed ? 'Завтра будет новый' : 'Забери ещё 15 кристаллов'}</small></span>
                {!daily.chestClaimed && <span aria-hidden="true">→</span>}
              </button>
            ) : <div className="chest-progress"><span aria-hidden="true">🎁</span><span>Собери 3 ключа — открой сундук БУКа</span></div>}
          </section>

          <button className="shop-banner" type="button" onClick={onOpenShop}>
            <span className="shop-banner-icon" aria-hidden="true">🎨</span><span><strong>Уголок БУКа</strong><small>Костюмы, очки и другие радости</small></span><span aria-hidden="true">→</span>
          </button>
          <section className="gentle-note"><span aria-hidden="true">💜</span><p>Можно заниматься каждый день или когда захочется. <strong>Пропуски ничего не отнимают.</strong></p></section>
        </aside>
      </div>

      <footer className="app-footer">Учимся думать, а не торопиться · Столбик хранит прогресс только на этом устройстве</footer>
      <FloatingOwl accent={profile.rewards.accentColor} accessories={profile.rewards.accessoriesEquipped} />
    </main>
  )
}
