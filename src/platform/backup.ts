import { isChildProfile, type ChildProfile } from '../state/profile'

export interface ProfileBackup {
  application: 'stolbik'
  schemaVersion: 1
  exportedAt: string
  profile: ChildProfile
}

export function createProfileBackup(profile: ChildProfile): ProfileBackup {
  return {
    application: 'stolbik',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    profile: structuredClone(profile)
  }
}

export function parseProfileBackup(text: string): ChildProfile {
  const data: unknown = JSON.parse(text)
  if (!data || typeof data !== 'object') throw new Error('В файле не найден профиль Столбика.')
  const candidate = data as Partial<ProfileBackup>
  if (candidate.application !== 'stolbik' || candidate.schemaVersion !== 1 || !isChildProfile(candidate.profile)) {
    throw new Error('Файл не похож на резервную копию Столбика или имеет неподдерживаемую версию.')
  }
  return candidate.profile
}

export function downloadProfileBackup(profile: ChildProfile): void {
  const backup = createProfileBackup(profile)
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `stolbik-${profile.name.toLocaleLowerCase('ru').replace(/[^a-zа-яё0-9]+/giu, '-')}-backup.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
