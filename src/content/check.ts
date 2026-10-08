import { generateExample, LEVELS, type LevelId } from './levels'
import { analyzeColumn } from '../engine/column'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function countCarries(a: number, b: number): number {
  const analysis = analyzeColumn(a, b, 'add')
  return analysis.steps.filter((step) => step.carryOut > 0).length
}

function hasBorrow(a: number, b: number): boolean {
  return analyzeColumn(a, b, 'subtract').steps.some((step) => step.borrow)
}

for (const level of LEVELS) {
  for (let sample = 0; sample < 600; sample += 1) {
    const example = generateExample(level.id as LevelId)
    const expected = example.operation === 'add' ? example.a + example.b : example.a - example.b
    const analysis = analyzeColumn(example.a, example.b, example.operation)
    assert(example.a >= 0 && example.b >= 0, `Уровень ${level.id}: отрицательный операнд`)
    assert(expected > 0, `Уровень ${level.id}: неположительный ответ`)
    assert(analysis.result === expected, `Уровень ${level.id}: неверный разбор ${example.a} ${example.operation} ${example.b}`)

    if (level.id === 1) {
      assert(example.a >= 10 && example.a < 100 && example.b < 10, 'Уровень 1 должен быть двузначным плюс однозначное')
      assert(countCarries(example.a, example.b) === 0, 'Уровень 1 не должен переносить')
    }
    if (level.id === 2 || level.id === 7) {
      assert(countCarries(example.a, example.b) === 0, `Уровень ${level.id}: ожидалось сложение без переноса`)
    }
    if (level.id === 3 || level.id === 8) {
      assert(countCarries(example.a, example.b) === 1, `Уровень ${level.id}: ожидался один перенос`)
    }
    if (level.id === 9) {
      assert(countCarries(example.a, example.b) === 2, 'Уровень 9 должен давать ровно два переноса')
    }
    if (level.id === 12) {
      assert(hasBorrow(example.a, example.b), 'Уровень 12 должен показывать заём через ноль')
      assert(Math.floor(example.a / 10) % 10 === 0 || example.a % 10 === 0, 'Уровень 12 должен содержать ноль в уменьшаемом')
    }
  }
}

console.log(`Проверено: ${LEVELS.length} уровней × 600 примеров. Невозможных примеров нет.`)
