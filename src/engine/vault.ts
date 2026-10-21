import type { ChildProfile } from '../state/profile'

export const SNAPSHOT_SLOTS = 3
export const SNAPSHOT_MIN_INTERVAL_MS = 30 * 60 * 1000
export const TRASH_MAX = 30
export const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const LOG_MAX = 40
export const EXPORT_REMINDER_MS = 14 * 24 * 60 * 60 * 1000

export type TrashReason = 'delete' | 'reset' | 'import' | 'backup'

export type LogKind =
  | 'boot'
  | 'hydrate-ok'
  | 'hydrate-error'
  | 'write-error'
  | 'snapshot'
  | 'restore-snapshot'
  | 'profile-delete'
  | 'profile-reset'
  | 'profile-restore'
  | 'import'
  | 'export'
  | 'persist-on'
  | 'persist-off'

export interface VaultLogEntry {
  at: number
  kind: LogKind
  note?: string
}

export interface SnapshotRecord {
  slot: number
  at: number
  profiles: ChildProfile[]
  activeProfileId: string | null
  totalSolved: number
  names: string[]
}

export const LOG_LABEL: Record<LogKind, string> = {
  boot: 'приложение открыто',
  'hydrate-ok': 'прогресс прочитан',
  'hydrate-error': 'прогресс не удалось прочитать',
  'write-error': 'не удалось сохранить',
  snapshot: 'сделана резервная копия',
  'restore-snapshot': 'восстановлено из копии',
  'profile-delete': 'профиль удалён в корзину',
  'profile-reset': 'прогресс сброшен',
  'profile-restore': 'профиль восстановлен',
  import: 'загружен файл',
  export: 'сохранён файл',
  'persist-on': 'защита от очистки включена',
  'persist-off': 'защита от очистки недоступна'
}

export function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n)
  const mod10 = abs % 10
  const mod100 = abs % 100
  const form =
    mod10 === 1 && mod100 !== 11
      ? one
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)
        ? few
        : many
  return `${n} ${form}`
}

export function agoLabel(at: number, now = Date.now()): string {
  const sec = Math.max(0, Math.round((now - at) / 1000))
  if (sec < 45) return 'только что'
  const min = Math.round(sec / 60)
  if (min < 60) return `${pluralRu(min, 'минуту', 'минуты', 'минут')} назад`
  const hours = Math.round(min / 60)
  if (hours < 24) return `${pluralRu(hours, 'час', 'часа', 'часов')} назад`
  const days = Math.round(hours / 24)
  if (days < 30) return `${pluralRu(days, 'день', 'дня', 'дней')} назад`
  return new Date(at).toLocaleDateString('ru-RU')
}

export function pushLogEntry(
  log: readonly VaultLogEntry[],
  kind: LogKind,
  note?: string,
  now = Date.now(),
  windowMs = 5 * 60 * 1000
): VaultLogEntry[] {
  const last = log[log.length - 1]
  if (last && last.kind === kind && last.note === note && now - last.at < windowMs) {
    return [...log]
  }
  const entry: VaultLogEntry = note ? { at: now, kind, note } : { at: now, kind }
  return [...log, entry].slice(-LOG_MAX)
}

export function nextSnapshotSlot(snapshots: readonly SnapshotRecord[], slots = SNAPSHOT_SLOTS): number {
  for (let slot = 1; slot <= slots; slot++) {
    if (!snapshots.some((s) => s.slot === slot)) return slot
  }
  const oldest = snapshots.reduce((a, b) => (a.at <= b.at ? a : b))
  return oldest.slot
}

export function upsertSnapshotRecord(
  snapshots: readonly SnapshotRecord[],
  record: SnapshotRecord
): SnapshotRecord[] {
  const rest = snapshots.filter((s) => s.slot !== record.slot)
  return [...rest, record].sort((a, b) => a.at - b.at).slice(-SNAPSHOT_SLOTS)
}

export function buildSnapshotRecord(
  slot: number,
  profiles: readonly ChildProfile[],
  activeProfileId: string | null,
  at = Date.now()
): SnapshotRecord {
  const cloned = profiles.map((p) => structuredClone(p))
  const totalSolved = cloned.reduce((sum, p) => sum + p.progress.totalSolved, 0)
  const names = cloned.map((p) => p.name)
  return {
    slot,
    at,
    profiles: cloned,
    activeProfileId,
    totalSolved,
    names
  }
}
