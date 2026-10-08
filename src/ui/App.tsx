import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { getHighestUnlockedLevel, type ChildProfile } from '../state/profile'
import { useAppStore } from '../state/store'
import type { LevelId } from '../content/levels'
const HomeScreen = lazy(() => import('./screens/HomeScreen').then((module) => ({ default: module.HomeScreen })))
const LessonScreen = lazy(() => import('./screens/LessonScreen').then((module) => ({ default: module.LessonScreen })))
const ParentGateScreen = lazy(() => import('./screens/ParentGateScreen').then((module) => ({ default: module.ParentGateScreen })))
const ParentScreen = lazy(() => import('./screens/ParentScreen').then((module) => ({ default: module.ParentScreen })))
const ProfileScreen = lazy(() => import('./screens/ProfileScreen').then((module) => ({ default: module.ProfileScreen })))
const ShopScreen = lazy(() => import('./screens/ShopScreen').then((module) => ({ default: module.ShopScreen })))

 type Screen = 'home' | 'lesson' | 'profiles' | 'parent-gate' | 'parents' | 'shop'

function randomGateQuestion(): { left: number; right: number } {
  return { left: 4 + Math.floor(Math.random() * 5), right: 3 + Math.floor(Math.random() * 6) }
}

function LoadingScreen() {
  return <main className="loading-screen"><div className="loading-mark">+</div><strong>СТОЛБИК</strong><span>БУК уже готовится к занятию…</span></main>
}

export function App() {
  const profiles = useAppStore((state) => state.profiles)
  const activeProfileId = useAppStore((state) => state.activeProfileId)
  const isReady = useAppStore((state) => state.isReady)
  const storageWarning = useAppStore((state) => state.storageWarning)
  const boot = useAppStore((state) => state.boot)
  const createChildProfile = useAppStore((state) => state.createChildProfile)
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
  const clearStorageWarning = useAppStore((state) => state.clearStorageWarning)
  const [screen, setScreen] = useState<Screen>('home')
  const [lessonLevel, setLessonLevel] = useState<LevelId>(1)
  const [gateQuestion, setGateQuestion] = useState(randomGateQuestion)

  useEffect(() => { void boot() }, [boot])

  const activeProfile = useMemo<ChildProfile | null>(() => (
    profiles.find((profile) => profile.id === activeProfileId) ?? null
  ), [profiles, activeProfileId])

  const startLesson = (levelId: LevelId) => {
    if (!activeProfile) return
    if (levelId > getHighestUnlockedLevel(activeProfile)) return
    setLessonLevel(levelId)
    updateSettings(activeProfile.id, { defaultLevel: levelId })
    setScreen('lesson')
  }

  const showProfiles = () => setScreen('profiles')
  const openParentGate = () => {
    setGateQuestion(randomGateQuestion())
    setScreen('parent-gate')
  }

  const handleCreateProfile = (name: string, color: string) => {
    createChildProfile(name, color)
    setScreen('home')
  }

  if (!isReady) return <LoadingScreen />

  if (screen === 'parent-gate') {
    return <Suspense fallback={<LoadingScreen />}><ParentGateScreen left={gateQuestion.left} right={gateQuestion.right} onCorrect={() => setScreen('parents')} onCancel={() => setScreen('home')} /></Suspense>
  }

  if (profiles.length === 0) {
    return <Suspense fallback={<LoadingScreen />}><ProfileScreen profiles={profiles} activeProfileId={activeProfileId} storageWarning={storageWarning} onSelect={selectProfile} onCreate={handleCreateProfile} /></Suspense>
  }

  if (screen === 'profiles' || !activeProfile) {
    return <Suspense fallback={<LoadingScreen />}><ProfileScreen profiles={profiles} activeProfileId={activeProfileId} storageWarning={storageWarning} onSelect={(profileId) => { selectProfile(profileId); setScreen('home') }} onCreate={handleCreateProfile} onBack={activeProfile ? () => setScreen('home') : undefined} /></Suspense>
  }

  if (screen === 'lesson') {
    return <Suspense fallback={<LoadingScreen />}><LessonScreen key={`${activeProfile.id}-${lessonLevel}`} profile={activeProfile} levelId={lessonLevel} onExit={() => setScreen('home')} onRecordMistake={recordMistake} onRecordCorrect={recordCorrect} onFinishLesson={finishLesson} /></Suspense>
  }

  if (screen === 'parents') {
    return <Suspense fallback={<LoadingScreen />}><ParentScreen profile={activeProfile} onBack={() => setScreen('home')} onSettingsChange={(changes) => updateSettings(activeProfile.id, changes)} onResetProgress={() => resetProgress(activeProfile.id)} onRestoreProfile={(imported) => restoreProfile(activeProfile.id, imported)} /></Suspense>
  }

  if (screen === 'shop') {
    return <Suspense fallback={<LoadingScreen />}><ShopScreen profile={activeProfile} onBack={() => setScreen('home')} onBuy={(id) => { buyAccessory(activeProfile.id, id) }} onToggle={(id) => toggleAccessory(activeProfile.id, id)} onRecolor={(color) => { recolorMascot(activeProfile.id, color) }} /></Suspense>
  }

  return <Suspense fallback={<LoadingScreen />}><HomeScreen
    profile={activeProfile}
    storageWarning={storageWarning}
    onStartLesson={startLesson}
    onOpenProfiles={showProfiles}
    onOpenParents={openParentGate}
    onOpenShop={() => setScreen('shop')}
    onClaimTask={(taskId) => claimDailyTask(activeProfile.id, taskId)}
    onClaimChest={() => claimDailyChest(activeProfile.id)}
    onDismissWarning={clearStorageWarning}
  /></Suspense>
}
