import { describe, expect, it } from 'vitest'
import { analyzeColumn } from '../../engine/column'
import { getSelfCheckStepText, getSelfCheckStepTitle } from './lessonSelfCheck'

describe('подписи для самопроверки', () => {
  it('кратко показывает сумму и перенос при сложении', () => {
    const { steps } = analyzeColumn(58, 27, 'add')

    expect(getSelfCheckStepTitle(steps[0]!)).toBe('Единицы')
    expect(getSelfCheckStepText(steps[0]!, 'add')).toBe('8 + 7 = 15. Пишем 5, переносим 1.')
    expect(getSelfCheckStepText(steps[1]!, 'add')).toBe('5 + 2 + 1 (перенос) = 8. Пишем 8.')
  })

  it('показывает, как ноль становится девять при размене через ноль', () => {
    const { steps } = analyzeColumn(300, 156, 'subtract')

    expect(getSelfCheckStepTitle(steps[0]!)).toBe('Единицы')
    expect(getSelfCheckStepText(steps[0]!, 'subtract')).toBe(
      'Размен: сотни 3 → 2; десятки 0 → 9. 10 − 6 = 4. Пишем 4.'
    )
  })

  it('показывает перенос как отдельный последний шаг', () => {
    const { steps } = analyzeColumn(90, 10, 'add')
    const finalCarry = steps.find((step) => step.isFinalCarry)

    expect(finalCarry).toBeDefined()
    expect(getSelfCheckStepTitle(finalCarry!)).toBe('Перенос')
    expect(getSelfCheckStepText(finalCarry!, 'add')).toBe('Записываем 1 в разряд сотен.')
  })
})
