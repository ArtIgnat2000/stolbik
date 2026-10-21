export interface RegisterSWOptions {
  immediate?: boolean
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
  onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void
}

export type RegisterSWFn = (options?: RegisterSWOptions) => (reloadPage?: boolean) => Promise<void>

export type UpdateCheckResult = 'update-ready' | 'up-to-date' | 'offline' | 'error'

const INSTALL_HINT_KEY = 'stolbik-install-hint'
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

let updateSW: ((reload?: boolean) => Promise<void>) | null = null
let swRegistration: ServiceWorkerRegistration | undefined
let updateAvailable = false

function notifyUpdateReady(): void {
  updateAvailable = true
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('stolbik:update'))
  }
}

export function isUpdateAvailable(): boolean {
  return updateAvailable
}

export function initPWA(registerSW: RegisterSWFn, onUpdate: () => void): void {
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => {
      updateAvailable = true
      onUpdate()
    },
    onRegisteredSW(_swUrl, registration) {
      swRegistration = registration
      if (!registration) return
      if (registration.waiting) {
        notifyUpdateReady()
      }
      const check = () => {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return
        void registration.update().catch(() => undefined)
      }
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check()
        })
      }
      setInterval(check, UPDATE_CHECK_INTERVAL_MS)
    }
  })
}

export function applyUpdate(): void {
  if (swRegistration?.waiting) {
    try {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
    } catch {
      /* ignore */
    }
  }
  if (updateSW) {
    void updateSW(true)
  } else if (typeof window !== 'undefined') {
    window.location.reload()
  }
}

function waitForInstallingWorker(worker: ServiceWorker, timeoutMs = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    if (worker.state === 'installed' || worker.state === 'activated') {
      resolve(true)
      return
    }
    if (worker.state === 'redundant') {
      resolve(false)
      return
    }
    const timer = setTimeout(() => {
      worker.removeEventListener('statechange', onStateChange)
      resolve(worker.state === 'installed' || worker.state === 'activated')
    }, timeoutMs)

    function onStateChange() {
      if (worker.state === 'installed' || worker.state === 'activated') {
        clearTimeout(timer)
        worker.removeEventListener('statechange', onStateChange)
        resolve(true)
      } else if (worker.state === 'redundant') {
        clearTimeout(timer)
        worker.removeEventListener('statechange', onStateChange)
        resolve(false)
      }
    }

    worker.addEventListener('statechange', onStateChange)
  })
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'offline'
  }
  if (updateAvailable) {
    notifyUpdateReady()
    return 'update-ready'
  }
  try {
    const registration =
      swRegistration ??
      (typeof navigator !== 'undefined' && 'serviceWorker' in navigator
        ? await navigator.serviceWorker.getRegistration()
        : undefined)

    if (registration) {
      swRegistration = registration
      if (registration.waiting) {
        notifyUpdateReady()
        return 'update-ready'
      }
      await registration.update()
      if (registration.waiting) {
        notifyUpdateReady()
        return 'update-ready'
      }
      if (registration.installing) {
        const installed = await waitForInstallingWorker(registration.installing)
        if (installed || registration.waiting) {
          notifyUpdateReady()
          return 'update-ready'
        }
      }
      return 'up-to-date'
    }

    return 'up-to-date'
  } catch {
    return 'error'
  }
}

export function resetPWAStateForTests(): void {
  updateAvailable = false
  swRegistration = undefined
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    (navigator as { standalone?: boolean }).standalone === true
  )
}

/** Показываем подсказку «добавить на экран» только один раз. */
export function shouldSuggestInstall(): boolean {
  if (isStandalone()) return false
  try {
    return !localStorage.getItem(INSTALL_HINT_KEY)
  } catch {
    return false
  }
}

export function markInstallHintShown(): void {
  try {
    localStorage.setItem(INSTALL_HINT_KEY, '1')
  } catch {
    /* ignore */
  }
}
