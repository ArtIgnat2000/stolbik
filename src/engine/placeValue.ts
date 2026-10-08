import type { Operation } from './column'

export interface CombineAction {
  kind: 'combine'
  place: number
  aDigit: number
  bDigit: number
  carryIn: number
  total: number
  needsRegroup: boolean
}

export interface RegroupAction {
  kind: 'regroup'
  fromPlace: number
  toPlace: number
  groupsOfTen: number
  unitsLeft: number
}

export interface ExchangeAction {
  kind: 'exchange'
  fromPlace: number
  toPlace: number
  sourceBefore: number
  targetBefore: number
}

export interface RemoveAction {
  kind: 'remove'
  place: number
  available: number
  amount: number
  remaining: number
}

export type PlaceValueAction = CombineAction | RegroupAction | ExchangeAction | RemoveAction

const PLACE_NAMES: Readonly<Record<number, string>> = Object.freeze({
  0: 'единиц',
  1: 'десятков',
  2: 'сотен',
  3: 'тысяч'
})

function digitAt(value: number, place: number): number {
  return Math.floor(value / 10 ** place) % 10
}

function lengthOf(value: number): number {
  return Math.max(1, String(value).length)
}

export function getPlaceName(place: number): string {
  return PLACE_NAMES[place] ?? 'старших разрядов'
}

/**
 * Builds a material-to-symbol model sequence: combine same-place units, regroup
 * ten units into one unit of the next place, or exchange one higher-place unit
 * for ten lower-place units before subtracting.
 */
export function buildPlaceValueActions(a: number, b: number, operation: Operation): PlaceValueAction[] {
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || a < 0 || b < 0) {
    throw new RangeError('Для модели нужны неотрицательные целые числа.')
  }
  if (operation === 'subtract' && a < b) {
    throw new RangeError('Модель вычитания не допускает отрицательный результат.')
  }

  const actions: PlaceValueAction[] = []
  const places = Math.max(lengthOf(a), lengthOf(b))

  if (operation === 'add') {
    let carry = 0
    for (let place = 0; place < places; place += 1) {
      const aDigit = digitAt(a, place)
      const bDigit = digitAt(b, place)
      const carryIn = carry
      const total = aDigit + bDigit + carryIn
      actions.push({ kind: 'combine', place, aDigit, bDigit, carryIn, total, needsRegroup: total >= 10 })
      if (total >= 10) {
        actions.push({ kind: 'regroup', fromPlace: place, toPlace: place + 1, groupsOfTen: Math.floor(total / 10), unitsLeft: total % 10 })
        carry = Math.floor(total / 10)
      } else {
        carry = 0
      }
    }
    if (carry > 0) {
      actions.push({ kind: 'combine', place: places, aDigit: 0, bDigit: 0, carryIn: carry, total: carry, needsRegroup: false })
    }
    return actions
  }

  const working = Array.from({ length: places }, (_, place) => digitAt(a, place))
  for (let place = 0; place < places; place += 1) {
    const take = digitAt(b, place)
    if (working[place]! < take) {
      let source = place + 1
      while (source < places && working[source] === 0) source += 1
      if (source >= places) throw new Error('Для размена не найден старший разряд.')
      while (source > place) {
        const sourceBefore = working[source]!
        const targetBefore = working[source - 1]!
        working[source] = sourceBefore - 1
        working[source - 1] = targetBefore + 10
        actions.push({ kind: 'exchange', fromPlace: source, toPlace: source - 1, sourceBefore, targetBefore })
        source -= 1
      }
    }
    const available = working[place]!
    if (take > 0) actions.push({ kind: 'remove', place, available, amount: take, remaining: available - take })
    working[place] = available - take
  }
  return actions
}
