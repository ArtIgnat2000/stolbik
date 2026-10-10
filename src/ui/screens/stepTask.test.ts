import { describe, expect, it } from 'vitest'
import { analyzeColumn, type Operation } from '../../engine/column'
import { getStepTask } from './stepTask'

function taskFor(a: number, b: number, operation: Operation, place: number) {
  const analysis = analyzeColumn(a, b, operation)
  const step = analysis.inputSteps.find((item) => item.place === place)
  if (!step) throw new Error(`Нет шага для разряда ${place}`)
  return getStepTask(step, operation)
}

describe('описание текущего шага для ребёнка', () => {
  it('сложение без перехода просит посчитать фишки и указывает разряд для ответа', () => {
    const task = taskFor(23, 14, 'add', 1)

    expect(task.placeTitle).toBe('Десятки')
    expect(task.question).toBe('Посчитай треугольники: 2 + 1 = ?')
    expect(task.why).toBeNull()
    expect(task.exchange).toBeNull()
    expect(task.instruction).toBe('Впиши цифру в разряд десятков.')
  })

  it('сложение с переходом объясняет размен десяти точек на треугольник', () => {
    const task = taskFor(36, 17, 'add', 0)

    expect(task.question).toBe('Посчитай точки: 6 + 7 = ?')
    expect(task.why).toBe('Десять точек — это один треугольник. Один уйдёт в разряд десятков, а в этом разряде останется последняя цифра.')
    expect(task.exchange?.text).toBe('10 точек = 1 треугольник')
    expect(task.exchange?.steps).toHaveLength(1)
  })

  it('перенос из прошлого разряда объясняется отдельной фразой', () => {
    const task = taskFor(36, 17, 'add', 1)

    expect(task.question).toBe('Посчитай треугольники: 3 + 1 + 1 = ?')
    expect(task.why).toBe('Сюда пришёл один треугольник: в прошлом разряде набралось десять точек.')
  })

  it('последний перенос превращается в новый разряд ответа', () => {
    const task = taskFor(96, 17, 'add', 2)

    expect(task.placeTitle).toBe('Сотни')
    expect(task.question).toBe('Из прошлого разряда пришёл 1 квадрат.')
    expect(task.instruction).toBe('Впиши цифру в разряд сотен. Это последняя цифра ответа.')
  });

  it('вычитание без размена просит убрать фишки и посчитать остаток', () => {
    const task = taskFor(57, 32, 'subtract', 0)

    expect(task.question).toBe('Убери 2 точки. Сколько останется?')
    expect(task.why).toBe('Зачёркнутые фишки убираем из модели.')
    expect(task.exchange).toBeNull()
  })

  it('вычитание с разменом показывает, откуда берётся десять единиц', () => {
    const task = taskFor(32, 15, 'subtract', 0)

    expect(task.question).toBe('Нужно убрать 5 точек, а в разряде только 2.')
    expect(task.why).toBe('Разменяем один треугольник на десять точек: стало 12.')
    expect(task.exchange?.text).toBe('1 треугольник = 10 точек')
  })

  it('размен через нулевой разряд показывает цепочку обменов', () => {
    const task = taskFor(300, 156, 'subtract', 0)

    expect(task.question).toBe('Нужно убрать 6 точек, а в разряде только 0.')
    expect(task.why).toBe('В разряде десятков ноль, поэтому размен идёт из разряда сотен. Стало 10 точек.')
    expect(task.exchange?.text).toBe('1 квадрат = 10 треугольников, 1 треугольник = 10 точек')
    expect(task.exchange?.steps).toHaveLength(2)
  })

  it('согласует число с названием фишки', () => {
    expect(taskFor(27, 4, 'subtract', 0).question).toBe('Убери 4 точки. Сколько останется?')
    expect(taskFor(57, 22, 'subtract', 1).question).toBe('Убери 2 треугольника. Сколько останется?')
  })
})
