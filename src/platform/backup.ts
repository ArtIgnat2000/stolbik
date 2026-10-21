import { isChildProfile, type ChildProfile } from '../state/profile'

export interface ProfileBackup {
  application: 'stolbik'
  schemaVersion: 1
  exportedAt: string
  profile: ChildProfile
  profiles?: ChildProfile[]
  activeProfileId?: string | null
}

export type ParsedBackup =
  | { kind: 'all'; profiles: ChildProfile[]; activeProfileId: string | null }
  | { kind: 'single'; profile: ChildProfile }

export function createProfileBackup(
  profile: ChildProfile,
  allProfiles?: readonly ChildProfile[],
  activeProfileId?: string | null
): ProfileBackup {
  const backup: ProfileBackup = {
    application: 'stolbik',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    profile: structuredClone(profile)
  }
  if (allProfiles && allProfiles.length > 0) {
    backup.profiles = allProfiles.map((item) => structuredClone(item))
    backup.activeProfileId = activeProfileId ?? profile.id
  }
  return backup
}

export function parseProfileBackup(text: string): ChildProfile {
  const data: unknown = JSON.parse(text)
  if (!data || typeof data !== 'object') throw new Error('В файле не найден профиль Столбика.')
  const candidate = data as Partial<ProfileBackup>
  if (candidate.application === 'stolbik' && candidate.schemaVersion === 1) {
    if (isChildProfile(candidate.profile)) return candidate.profile
    if (Array.isArray(candidate.profiles)) {
      const valid = candidate.profiles.filter(isChildProfile)
      if (valid[0]) return valid[0]
    }
  }
  throw new Error('Файл не похож на резервную копию Столбика или имеет неподдерживаемую версию.')
}

export function parseBackupPayload(text: string): ParsedBackup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Не удалось прочитать JSON-файл резервной копии.')
  }
  if (!data || typeof data !== 'object') throw new Error('В файле не найден профиль Столбика.')
  const candidate = data as Partial<ProfileBackup>
  if (candidate.application !== 'stolbik' || candidate.schemaVersion !== 1) {
    throw new Error('Файл не похож на резервную копию Столбика или имеет неподдерживаемую версию.')
  }
  if (Array.isArray(candidate.profiles)) {
    const valid = candidate.profiles.filter(isChildProfile)
    if (valid.length > 0) {
      const activeId =
        typeof candidate.activeProfileId === 'string' && valid.some((p) => p.id === candidate.activeProfileId)
          ? candidate.activeProfileId
          : valid[0]!.id
      return { kind: 'all', profiles: valid, activeProfileId: activeId }
    }
  }
  if (isChildProfile(candidate.profile)) {
    return { kind: 'single', profile: candidate.profile }
  }
  throw new Error('Файл не похож на резервную копию Столбика или имеет неподдерживаемую версию.')
}

export function downloadProfileBackup(
  profile: ChildProfile,
  allProfiles?: readonly ChildProfile[],
  activeProfileId?: string | null
): void {
  const backup = createProfileBackup(profile, allProfiles, activeProfileId)
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const dateSlug = new Date().toISOString().slice(0, 10)
  const nameSlug = profile.name.toLocaleLowerCase('ru').replace(/[^a-zа-яё0-9]+/giu, '-')
  anchor.href = url
  anchor.download = `stolbik-${nameSlug || dateSlug}-backup.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
