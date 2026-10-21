import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { LevelId } from '../content/levels'
import { onExternalSync } from '../platform/database'
import { applyUpdate, markInstallHintShown, shouldSuggestInstall } from '../platform/pwa'
import { getHighestUnlockedLevel, type ChildProfile } from '../state/profile'
import { useAppStore } from '../state/store'
import { FloatingOwl } from './components/FloatingOwl'

const HomeScreen = lazy(() => import('./screens/HomeScreen').then((module) => ({ default: module.HomeScreen })))
const TopicsScreen = lazy(() => import('./screens/TopicsScreen').then((module) => ({ default: module.TopicsScreen })))
const LessonScreen = lazy(() => import('./screens/LessonScreen').then((module) => ({ default: module.LessonScreen })))
const ParentGateScreen = lazy(() => import('./screens/ParentGateScreen').then((module) => ({ default: module.ParentGateScreen })))
const ParentScreen = lazy(() => import('./screens/ParentScreen').then((module) => ({ default: module.ParentScreen })))
const ProfileScreen = lazy(() => import('./screens/ProfileScreen').then((module) => ({ default: module.ProfileScreen })))
const ShopScreen = lazy(() => import('./screens/ShopScreen').then((module) => ({ default: module.ShopScreen })))

type Screen = 'home' | 'topics' | 'lesson' | 'profiles' | 'parent-gate' | 'parents' | 'shop'

function randomGateQuestion(): { left: number; right: number } {
  return { left: 4 + Math.floor(Math.random() * 5), right: 3 + Math.floor(Math.random() * 6) }
}

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <div className="loading-mark">+</div>
      <strong>СТОЛБИК</strong>
      <span>БУК уже готовится к занятию…</span>
    </main>
  )
}

export function App() {
  const profiles = useAppStore((state) => state.profiles)
  const activeProfileId = useAppStore((state) => state.activeProfileId)
  const isReady = useAppStore((state) => state.isReady)
  const storageWarning = useAppStore((state) => state.storageWarning)
  const boot = useAppStore((state) => state.boot)
  const reloadFromStorage = useAppStore((state) => state.reloadFromStorage)
  const createChildProfile = useAppStore((state) => state.createChildProfile)
  const renameChildProfile = useAppStore((state) => state.renameChildProfile)
  const deleteChildProfile = useAppStore((state) => state.deleteChildProfile)
  const selectProfile = useAppStore((state) => state.selectProfile)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const recordMistake = useAppStore((state) => state.recordMistake)
  const recordCorrect = useAppStore((state) => state.recordCorrect)
  const finishLesson = useAppStore((state) => state.finishLesson)
  const claimDailyTask = useAppStore((state) => state.claimDailyTask)
  const claimDailyChest = useAppStore((state) => state.claimDailyChest)
  const buyAccessory = useAppStore((state) => state.buyAccessory)
  const toggleAccessory = useAppStore((state) => state.toggleAccessory)
  const recolorMascot = useAppStore((state) => state.recolorMascot)
  const resetProgress = useAppStore((state) => state.resetProgress)
  const restoreProfile = useAppStore((state) => state.restoreProfile)
  const replaceAllFromBackup = useAppStore((state) => state.replaceAllFromBackup)
  const restoreFromSnapshot = useAppStore((state) => state.restoreFromSnapshot)
  const restoreProfileFromTrash = useAppStore((state) => state.restoreProfileFromTrash)
  const clearStorageWarning = useAppStore((state) => state.clearStorageWarning)

  const [screen, setScreen] = useState<Screen>('home')
  const [lessonLevel, setLessonLevel] = useState<LevelId>(1)
  const [gateQuestion, setGateQuestion] = useState(randomGateQuestion)
  const [parentUnlocked, setParentUnlocked] = useState(false)
  const [profilesFromParent, setProfilesFromParent] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)
  const [installHint, setInstallHint] = useState(() => shouldSuggestInstall())

  useEffect(() => {
    void boot()
  }, [boot])

  useEffect(() => {
    const onUpdate = () => setUpdateReady(true)
    window.addEventListener('stolbik:update', onUpdate)
    return () => window.removeEventListener('stolbik:update', onUpdate)
  }, [])

  // Синхронизация между открытыми вкладками / установленным ярлыком
  const inLesson = useRef(false)
  inLesson.current = screen === 'lesson'
  const syncPending = useRef(false)

  useEffect(() => {
    const sync = () => {
      if (inLesson.current) {
        syncPending.current = true
        return
      }
      void reloadFromStorage()
    }
    const offExternal = onExternalSync(sync)
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      offExternal()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reloadFromStorage])

  useEffect(() => {
    if (screen === 'lesson' || !syncPending.current) return
    syncPending.current = false
    void reloadFromStorage()
  }, [screen, reloadFromStorage])

  const activeProfile = useMemo<ChildProfile | null>(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? null,
    [profiles, activeProfileId]
  )

  const startLesson = (levelId: LevelId) => {
    if (!activeProfile) return
    if (levelId > getHighestUnlockedLevel(activeProfile)) return
    setParentUnlocked(false)
    setLessonLevel(levelId)
    updateSettings(activeProfile.id, { defaultLevel: levelId })
    setScreen('lesson')
  }

  const showProfiles = (fromParent = false) => {
    setProfilesFromParent(fromParent)
    setScreen('profiles')
  }

  const openParents = () => {
    if (parentUnlocked) {
      setScreen('parents')
      return
    }
    setGateQuestion(randomGateQuestion())
    setScreen('parent-gate')
  }

  const switchMainTab = (next: 'home' | 'topics' | 'shop' | 'parents') => {
    setProfilesFromParent(false)
    if (next === 'parents') {
      openParents()
      return
    }
    setParentUnlocked(false)
    setScreen(next)
  }

  const handleCreateProfile = (name: string, color: string) => {
    createChildProfile(name, color)
    setProfilesFromParent(false)
    setScreen('home')
  }

  const dismissInstallHint = () => {
    markInstallHintShown()
    setInstallHint(false)
  }

  if (!isReady) return <LoadingScreen />

  if (profiles.length === 0) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <ProfileScreen
          profiles={profiles}
          activeProfileId={activeProfileId}
          storageWarning={storageWarning}
          onSelect={selectProfile}
          onCreate={handleCreateProfile}
          onRename={renameChildProfile}
        />
      </Suspense>
    )
  }

  if (screen === 'profiles' || !activeProfile) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <ProfileScreen
          profiles={profiles}
          activeProfileId={activeProfileId}
          storageWarning={storageWarning}
          manage={parentUnlocked && profilesFromParent}
          onSelect={(profileId) => {
            selectProfile(profileId)
            setScreen(profilesFromParent ? 'parents' : 'home')
            setProfilesFromParent(false)
          }}
          onCreate={handleCreateProfile}
          onRename={renameChildProfile}
          onDelete={deleteChildProfile}
          onBack={
            activeProfile
              ? () => {
                  setScreen(profilesFromParent ? 'parents' : 'home')
                  setProfilesFromParent(false)
                }
              : undefined
          }
        />
      </Suspense>
    )
  }

  if (screen === 'lesson') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <LessonScreen
          key={`${activeProfile.id}-${lessonLevel}`}
          profile={activeProfile}
          levelId={lessonLevel}
          onExit={() => setScreen('home')}
          onRecordMistake={recordMistake}
          onRecordCorrect={recordCorrect}
          onFinishLesson={finishLesson}
        />
      </Suspense>
    )
  }

  const mascotSetting = activeProfile.settings.mascotVisibility ?? 'on'
  const showMascot =
    mascotSetting !== 'off' &&
    (screen === 'home' || (mascotSetting === 'on' && screen === 'topics'))

  return (
    <div className="app-with-tabs">
      <Suspense fallback={<LoadingScreen />}>
        {screen === 'parent-gate' ? (
          <ParentGateScreen
            left={gateQuestion.left}
            right={gateQuestion.right}
            onCorrect={() => {
              setParentUnlocked(true)
              setScreen('parents')
            }}
            onCancel={() => setScreen('home')}
          />
        ) : screen === 'parents' ? (
          <ParentScreen
            profile={activeProfile}
            allProfiles={profiles}
            activeProfileId={activeProfileId}
            onBack={() => {
              setParentUnlocked(false)
              setScreen('home')
            }}
            onOpenProfiles={() => showProfiles(true)}
            onOpenTopics={() => {
              setParentUnlocked(false)
              setScreen('topics')
            }}
            onSettingsChange={(changes) => updateSettings(activeProfile.id, changes)}
            onResetProgress={() => resetProgress(activeProfile.id)}
            onRestoreProfile={(imported) => restoreProfile(activeProfile.id, imported)}
            onReplaceAllProfiles={replaceAllFromBackup}
            onRestoreSnapshot={restoreFromSnapshot}
            onRestoreFromTrash={restoreProfileFromTrash}
          />
        ) : screen === 'shop' ? (
          <ShopScreen
            profile={activeProfile}
            onBack={() => setScreen('home')}
            onBuy={(id) => {
              buyAccessory(activeProfile.id, id)
            }}
            onToggle={(id) => toggleAccessory(activeProfile.id, id)}
            onRecolor={(color) => {
              recolorMascot(activeProfile.id, color)
            }}
          />
        ) : screen === 'topics' ? (
          <TopicsScreen profile={activeProfile} onStartLesson={startLesson} />
        ) : (
          <HomeScreen
            profile={activeProfile}
            storageWarning={storageWarning}
            onStartLesson={startLesson}
            onOpenProfiles={() => showProfiles(false)}
            onOpenParents={openParents}
            onOpenShop={() => setScreen('shop')}
            onClaimTask={(taskId) => claimDailyTask(activeProfile.id, taskId)}
            onClaimChest={() => claimDailyChest(activeProfile.id)}
            onDismissWarning={clearStorageWarning}
          />
        )}
      </Suspense>

      {showMascot && (
        <FloatingOwl
          accent={activeProfile.rewards.accentColor}
          accessories={activeProfile.rewards.accessoriesEquipped}
          raised={updateReady || installHint}
        />
      )}

      {updateReady && (
        <div className="pwa-footer-bar" role="status">
          <div className="pwa-footer-inner">
            <div className="pwa-footer-copy">
              <strong>Доступно обновление</strong>
              <small>Обновим, чтобы занятия стали ещё лучше</small>
            </div>
            <button type="button" className="primary-button compact-btn" onClick={() => applyUpdate()}>
              Обновить
            </button>
          </div>
        </div>
      )}

      {!updateReady && installHint && (
        <div className="pwa-footer-bar" role="status">
          <div className="pwa-footer-inner">
            <div className="pwa-footer-copy">
              <strong>📲 Добавь приложение на экран</strong>
              <small>Будет работать без интернета</small>
            </div>
            <button type="button" className="primary-button compact-btn" onClick={dismissInstallHint}>
              Понятно
            </button>
          </div>
        </div>
      )}

      <nav className="app-tabs" aria-label="Разделы программы">
        <button
          type="button"
          className={`app-tab${screen === 'home' ? ' app-tab-active' : ''}`}
          onClick={() => switchMainTab('home')}
        >
          <span className="app-tab-ico" aria-hidden="true">🗺️</span>
          <span>Уроки</span>
        </button>
        <button
          type="button"
          className={`app-tab${screen === 'topics' ? ' app-tab-active' : ''}`}
          onClick={() => switchMainTab('topics')}
        >
          <span className="app-tab-ico" aria-hidden="true">📖</span>
          <span>Темы</span>
        </button>
        <button
          type="button"
          className={`app-tab${screen === 'shop' ? ' app-tab-active' : ''}`}
          onClick={() => switchMainTab('shop')}
        >
          <span className="app-tab-ico" aria-hidden="true">🎩</span>
          <span>БУК</span>
        </button>
        <button
          type="button"
          className={`app-tab${screen === 'parents' || screen === 'parent-gate' ? ' app-tab-active' : ''}`}
          onClick={() => switchMainTab('parents')}
        >
          <span className="app-tab-ico" aria-hidden="true">👨‍👩‍👧</span>
          <span>Родителям</span>
        </button>
      </nav>
    </div>
  )
}
