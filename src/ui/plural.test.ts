import { describe, expect, it } from 'vitest'
import { plural, pluralForm, EXAMPLES, CROWNS, MISTAKES } from './plural'

describe('согласование числительных', () => {
  it('склоняет существительное по правилам русского языка', () => {
    expect(plural(1, EXAMPLES)).toBe('1 пример')
    expect(plural(2, EXAMPLES)).toBe('2 примера')
    expect(plural(4, EXAMPLES)).toBe('4 примера')
    expect(plural(5, EXAMPLES)).toBe('5 примеров')
    expect(plural(8, EXAMPLES)).toBe('8 примеров')
    expect(plural(11, EXAMPLES)).toBe('11 примеров')
    expect(plural(21, EXAMPLES)).toBe('21 пример')
    expect(plural(0, EXAMPLES)).toBe('0 примеров')
  })

  it('склоняет короны, ошибки и ключи', () => {
    expect(plural(0, CROWNS)).toBe('0 корон')
    expect(plural(1, CROWNS)).toBe('1 корона')
    expect(plural(3, CROWNS)).toBe('3 короны')
    expect(plural(1, MISTAKES)).toBe('1 ошибка')
    expect(plural(2, MISTAKES)).toBe('2 ошибки')
    expect(plural(7, MISTAKES)).toBe('7 ошибок')
    expect(pluralForm(12, MISTAKES)).toBe('ошибок')
  })
})
