import { pluralForm } from './plural'

/**
 * Названия разрядов — слева направо, как в столбике: сотни, десятки, единицы.
 * Нужны и подписям столбика, и наглядной модели из фишек.
 */
export const PLACE_TITLES: readonly string[] = Object.freeze([
  'Единицы',
  'Десятки',
  'Сотни',
  'Тысячи'
])

/**
 * Фишки разрядной модели: точка — единица, треугольник — десяток (10 точек),
 * квадрат — сотня (10 треугольников), тысяча — квадрат из десяти квадратов.
 */
const TOKEN_FORMS: ReadonlyArray<{ one: string; few: string; many: string }> = Object.freeze([
  { one: 'точка', few: 'точки', many: 'точек' },
  { one: 'треугольник', few: 'треугольника', many: 'треугольников' },
  { one: 'квадрат', few: 'квадрата', many: 'квадратов' },
  { one: 'тысяча', few: 'тысячи', many: 'тысяч' }
])

export function placeTitle(place: number): string {
  return PLACE_TITLES[place] ?? 'Разряд'
}

/** «единицы», «десятки» — именительный падеж строчными: «считаем десятки». */
export function placeTitleLower(place: number): string {
  return placeTitle(place).toLowerCase()
}

/** «в разряде единиц», «в разряде десятков» — родительный падеж. */
const PLACE_GENITIVE: readonly string[] = Object.freeze([
  'единиц',
  'десятков',
  'сотен',
  'тысяч'
])

export function placeGenitive(place: number): string {
  return PLACE_GENITIVE[place] ?? 'старших разрядов'
}

/** «убери 1 точку», «убери 2 треугольника» — винительный падеж после «убери». */
const TOKEN_ACCUSATIVE: ReadonlyArray<{ one: string; few: string; many: string }> = Object.freeze([
  { one: 'точку', few: 'точки', many: 'точек' },
  { one: 'треугольник', few: 'треугольника', many: 'треугольников' },
  { one: 'квадрат', few: 'квадрата', many: 'квадратов' },
  { one: 'тысячу', few: 'тысячи', many: 'тысяч' }
])

/** «точек», «треугольник» — название фишки, согласованное с числом. */
export function tokenName(place: number, count = 2): string {
  const forms = TOKEN_FORMS[place] ?? TOKEN_FORMS[0]
  return pluralForm(count, forms)
}

/** «1 точку», «5 точек» — фишка в винительном падеже, согласованная с числом. */
export function tokenAccusative(place: number, count: number): string {
  const forms = TOKEN_ACCUSATIVE[place] ?? TOKEN_ACCUSATIVE[0]
  return pluralForm(count, forms)
}

/** «посчитай точки», «посчитай треугольники» — винительный падеж множественного числа. */
const TOKENS_MANY: readonly string[] = Object.freeze([
  'точки',
  'треугольники',
  'квадраты',
  'тысячи'
])

export function tokensMany(place: number): string {
  return TOKENS_MANY[place] ?? TOKENS_MANY[0]
}

/** «3 точки», «1 треугольник» — счётная подпись рядом с фишками. */
export function tokenCount(place: number, count: number): string {
  return `${count} ${tokenName(place, count)}`
}
