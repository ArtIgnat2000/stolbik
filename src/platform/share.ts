/**
 * Ссылка на приложение и способы ею поделиться.
 *
 * Прогресс каждого ученика хранится локально на его устройстве, поэтому
 * «передать ссылку новому ученику» — это передать адрес самого приложения
 * или показать QR-код, чтобы его отсканировали с другого телефона.
 */

export function appUrl(): string {
  const env = (import.meta as { env?: Record<string, unknown> }).env
  const pinned = env?.VITE_PUBLIC_URL
  if (typeof pinned === 'string' && pinned.trim() !== '') return pinned.trim()
  const base = typeof env?.BASE_URL === 'string' && env.BASE_URL ? env.BASE_URL : '/'
  if (typeof window === 'undefined') return base
  try {
    return new URL(base, window.location.origin).href
  } catch {
    return base
  }
}

export function linkLabel(url: string = appUrl()): string {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname.replace(/\/+$/, '')
    return `${parsed.host}${path}`
  } catch {
    return url
  }
}

export const SHARE_TITLE = 'СТОЛБИК — сложение и вычитание столбиком, 2 класс'

export function shareText(): string {
  return 'СТОЛБИК — спокойный тренажёр сложения и вычитания столбиком для 2 класса. Открой ссылку и добавь приложение на экран телефона: работает без интернета.'
}

export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

export type ShareOutcome = 'shared' | 'cancelled' | 'copied' | 'manual'

export async function shareApp(): Promise<ShareOutcome> {
  if (canNativeShare()) {
    try {
      await navigator.share({ title: SHARE_TITLE, text: shareText(), url: appUrl() })
      return 'shared'
    } catch (error) {
      const name = (error as { name?: string } | undefined)?.name
      if (name === 'AbortError' || name === 'NotAllowedError') return 'cancelled'
    }
  }
  return copyAppLink()
}

export async function copyAppLink(): Promise<ShareOutcome> {
  const url = appUrl()
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return 'copied'
    }
  } catch {
    /* переходим к запасному способу */
  }
  try {
    if (typeof document !== 'undefined') {
      const area = document.createElement('textarea')
      area.value = url
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.top = '-1000px'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = typeof document.execCommand === 'function' ? document.execCommand('copy') : false
      document.body.removeChild(area)
      if (ok) return 'copied'
    }
  } catch {
    /* остаётся ручной способ: показываем ссылку текстом */
  }
  return 'manual'
}
