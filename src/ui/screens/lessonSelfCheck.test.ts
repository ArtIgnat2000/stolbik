import { describe, expect, it } from 'vitest'
import { analyzeColumn } from '../../engine/column'
import { buildLessonMicroSteps } from './lessonSelfCheck'

describe('пошаговый разбор и самопроверка', () => {
  it('разделяет сложение, обмен и запись переноса на короткие шаги', () => {
    const steps = buildLessonMicroSteps(analyzeColumn(58, 27, 'add'))

    expect(steps.map(({ kind, title, text }) => ({ kind, title, text }))).toEqual([
      { kind: 'calculate', title: 'Считаем единицы', text: '8 + 7 = 15 единиц.' },
      { kind: 'exchange', title: 'Собираем десяток', text: '10 единиц = 1 десяток.' },
      { kind: 'write', title: 'Записываем единицы', text: 'Запиши 5 в единицы.' },
      { kind: 'carry', title: 'Переносим десяток', text: 'Перенос: 1 десяток → в разряд десятков.' },
      { kind: 'calculate', title: 'Считаем десятки', text: '5 + 2 + 1 = 8 десятков.' },
      { kind: 'write', title: 'Записываем десятки', text: 'Запиши 8 в десятки.' }
    ])
  })

  it('показывает каждый обмен отдельно при вычитании через ноль', () => {
    const steps = buildLessonMicroSteps(analyzeColumn(300, 156, 'subtract'))

    expect(steps.map(({ kind, title, text }) => ({ kind, title, text }))).toEqual([
      { kind: 'exchange', title: 'Обмениваем сотню', text: '1 сотня → 10 десятков.' },
      { kind: 'exchange', title: 'Обмениваем десяток', text: '1 десяток → 10 единиц.' },
      { kind: 'calculate', title: 'Считаем единицы', text: '10 − 6 = 4 единицы.' },
      { kind: 'write', title: 'Записываем единицы', text: 'Запиши 4 в единицы.' },
      { kind: 'calculate', title: 'Считаем десятки', text: '9 − 5 = 4 десятка.' },
      { kind: 'write', title: 'Записываем десятки', text: 'Запиши 4 в десятки.' },
      { kind: 'calculate', title: 'Считаем сотни', text: '2 − 1 = 1 сотня.' },
      { kind: 'write', title: 'Записываем сотни', text: 'Запиши 1 в сотни.' }
    ])
  })

  it('оставляет итоговый перенос отдельным действием', () => {
    const steps = buildLessonMicroSteps(analyzeColumn(90, 10, 'add'))
    const finalCarry = steps.at(-1)

    expect(finalCarry).toMatchObject({
      kind: 'write',
      title: 'Записываем сотни',
      text: 'Запиши цифру 1 в сотни.',
      digit: 1
    })
  })
})
