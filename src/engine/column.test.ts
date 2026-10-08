import { describe, expect, it } from 'vitest'
import { analyzeColumn } from './column'
import { generateExample, LEVELS } from '../content/levels'

describe('разбор столбиком', () => {
  it('складывает справа налево и показывает перенос', () => {
    const analysis = analyzeColumn(37, 25, 'add')
    expect(analysis.result).toBe(62)
    expect(analysis.inputSteps.map((step) => step.expectedDigit)).toEqual([2, 6])
    expect(analysis.steps[0]?.carryOut).toBe(1)
    expect(analysis.steps[0]?.explanation).toContain('переносим в разряд десятков')
  })

  it('добавляет отдельный старший разряд, если сумма стала четырёхзначной', () => {
    const analysis = analyzeColumn(876, 255, 'add')
    expect(analysis.result).toBe(1131)
    expect(analysis.inputSteps.map((step) => step.expectedDigit)).toEqual([1, 3, 1, 1])
    expect(analysis.inputSteps[3]?.isFinalCarry).toBe(true)
  })

  it('занимает десяток при вычитании', () => {
    const analysis = analyzeColumn(42, 27, 'subtract')
    expect(analysis.result).toBe(15)
    expect(analysis.steps[0]?.borrow?.changes).toEqual([
      { place: 1, before: 4, after: 3 },
      { place: 0, before: 2, after: 12 }
    ])
    expect(analysis.inputSteps.map((step) => step.expectedDigit)).toEqual([5, 1])
  })

  it('правильно занимает через ноль: 500 − 127', () => {
    const analysis = analyzeColumn(500, 127, 'subtract')
    expect(analysis.result).toBe(373)
    expect(analysis.steps[0]?.borrow?.changes).toEqual([
      { place: 2, before: 5, after: 4 },
      { place: 1, before: 0, after: 9 },
      { place: 0, before: 0, after: 10 }
    ])
    expect(analysis.steps.map((step) => step.expectedDigit)).toEqual([3, 7, 3])
    expect(analysis.steps[0]?.explanation).toContain('5 становится 4')
    expect(analysis.steps[0]?.explanation).toContain('0 становится 9')
  })

  it('отклоняет невозможные вычитания и дробные числа', () => {
    expect(() => analyzeColumn(10, 11, 'subtract')).toThrow(RangeError)
    expect(() => analyzeColumn(2.5, 1, 'add')).toThrow(RangeError)
  })
})

describe('генератор тем', () => {
  it('генерирует правильные неотрицательные примеры для всех уровней', () => {
    for (const level of LEVELS) {
      for (let count = 0; count < 80; count += 1) {
        const example = generateExample(level.id)
        const analysis = analyzeColumn(example.a, example.b, example.operation)
        expect(analysis.result).toBe(example.operation === 'add' ? example.a + example.b : example.a - example.b)
        expect(analysis.result).toBeGreaterThan(0)
      }
    }
  })
})
