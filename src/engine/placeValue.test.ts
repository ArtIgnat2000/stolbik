import { describe, expect, it } from 'vitest'
import { buildPlaceValueActions } from './placeValue'

describe('модель разрядов и разменов', () => {
  it('сначала объединяет единицы, затем перегруппировывает десять в десяток', () => {
    const actions = buildPlaceValueActions(37, 25, 'add')
    expect(actions).toEqual([
      { kind: 'combine', place: 0, aDigit: 7, bDigit: 5, carryIn: 0, total: 12, needsRegroup: true },
      { kind: 'regroup', fromPlace: 0, toPlace: 1, groupsOfTen: 1, unitsLeft: 2 },
      { kind: 'combine', place: 1, aDigit: 3, bDigit: 2, carryIn: 1, total: 6, needsRegroup: false }
    ])
  })

  it('разменивает десяток на десять единиц, прежде чем вычитать', () => {
    const actions = buildPlaceValueActions(42, 27, 'subtract')
    expect(actions).toEqual([
      { kind: 'exchange', fromPlace: 1, toPlace: 0, sourceBefore: 4, targetBefore: 2 },
      { kind: 'remove', place: 0, available: 12, amount: 7, remaining: 5 },
      { kind: 'remove', place: 1, available: 3, amount: 2, remaining: 1 }
    ])
  })

  it('показывает последовательный размен через нулевой разряд', () => {
    const actions = buildPlaceValueActions(500, 127, 'subtract')
    expect(actions).toEqual([
      { kind: 'exchange', fromPlace: 2, toPlace: 1, sourceBefore: 5, targetBefore: 0 },
      { kind: 'exchange', fromPlace: 1, toPlace: 0, sourceBefore: 10, targetBefore: 0 },
      { kind: 'remove', place: 0, available: 10, amount: 7, remaining: 3 },
      { kind: 'remove', place: 1, available: 9, amount: 2, remaining: 7 },
      { kind: 'remove', place: 2, available: 4, amount: 1, remaining: 3 }
    ])
  })

  it('не допускает отрицательную задачу на вычитание', () => {
    expect(() => buildPlaceValueActions(10, 11, 'subtract')).toThrow(RangeError)
  })
})
