/**
 * Русские числительные согласуются с существительным: 1 пример, 2 примера, 5 примеров.
 * Карточки приложения показывают разные счётчики, поэтому согласование вынесено сюда.
 */
export interface PluralForms {
  one: string
  few: string
  many: string
}

export function pluralForm(count: number, forms: PluralForms): string {
  const lastTwo = Math.abs(count) % 100
  const last = Math.abs(count) % 10
  if (lastTwo >= 11 && lastTwo <= 14) return forms.many
  if (last === 1) return forms.one
  if (last >= 2 && last <= 4) return forms.few
  return forms.many
}

export function plural(count: number, forms: PluralForms): string {
  return `${count} ${pluralForm(count, forms)}`
}

export const EXAMPLES: PluralForms = { one: 'пример', few: 'примера', many: 'примеров' }
export const MISTAKES: PluralForms = { one: 'ошибка', few: 'ошибки', many: 'ошибок' }
export const CROWNS: PluralForms = { one: 'корона', few: 'короны', many: 'корон' }
export const KEYS: PluralForms = { one: 'ключ', few: 'ключа', many: 'ключей' }
export const BACKUPS: PluralForms = { one: 'копия', few: 'копии', many: 'копий' }
export const PUPILS: PluralForms = { one: 'ученик', few: 'ученика', many: 'учеников' }
