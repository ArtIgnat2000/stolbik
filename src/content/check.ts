import { generateExample, LEVELS, type LevelId } from './levels'
import { analyzeColumn } from '../engine/column'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function countCarries(a: number, b: number): number {
  return analyzeColumn(a, b, 'add').steps.filter((step) => step.carryOut > 0).length
}

function countBorrows(a: number, b: number): number {
  return analyzeColumn(a, b, 'subtract').steps.filter((step) => step.borrow).length
}

function hasBorrowThroughZero(a: number, b: number): boolean {
  return analyzeColumn(a, b, 'subtract').steps.some((step) => (
    step.borrow?.changes.some((change) => change.place > step.place && change.before === 0 && change.after === 9) ?? false
  ))
}

for (const level of LEVELS) {
  for (let sample = 0; sample < 600; sample += 1) {
    const example = generateExample(level.id as LevelId)
    const expected = example.operation === 'add' ? example.a + example.b : example.a - example.b
    const analysis = analyzeColumn(example.a, example.b, example.operation)
    assert(example.a >= 0 && example.b >= 0, `Уровень ${level.id}: отрицательный операнд`)
    assert(expected > 0, `Уровень ${level.id}: неположительный ответ`)
    assert(analysis.result === expected, `Уровень ${level.id}: неверный разбор ${example.a} ${example.operation} ${example.b}`)

    switch (level.id) {
      case 1:
        if (example.operation === 'add') assert(countCarries(example.a, example.b) === 0, 'Уровень 1: повторение без переноса')
        else assert(countBorrows(example.a, example.b) === 0, 'Уровень 1: повторение без размена')
        break
      case 2:
        if (example.operation === 'add') {
          assert(example.b < 10 && (example.a + example.b) % 10 === 0, 'Уровень 2: пример на дополнение до круглого десятка')
          assert(countCarries(example.a, example.b) === 1, 'Уровень 2: нужен переход через десяток')
        } else {
          assert(example.a % 10 === 0 && example.b < 10, 'Уровень 2: вычитание из круглого десятка')
          assert(countBorrows(example.a, example.b) === 1, 'Уровень 2: нужен размен десятка')
        }
        break
      case 3:
        if (example.operation === 'add') {
          assert((example.a + example.b) % 10 === 0 && countCarries(example.a, example.b) === 1, 'Уровень 3: сумма должна быть круглым десятком')
        } else {
          assert(example.a % 10 === 0 && example.b >= 10 && example.b % 10 > 0, 'Уровень 3: вычитание двузначного числа из круглого десятка')
          assert(countBorrows(example.a, example.b) === 1, 'Уровень 3: ожидается размен единиц')
        }
        break
      case 4:
        assert(example.operation === 'add' && Math.min(example.a, example.b) < 10 && Math.max(example.a, example.b) >= 10 && countCarries(example.a, example.b) === 1, 'Уровень 4: двузначное плюс однозначное с переходом, в любом порядке')
        break
      case 5:
        assert(example.operation === 'add' && example.a >= 10 && example.b >= 10 && countCarries(example.a, example.b) === 1, 'Уровень 5: двузначное сложение с одним переходом')
        break
      case 6:
        assert(example.operation === 'subtract' && example.b < 10 && countBorrows(example.a, example.b) === 1, 'Уровень 6: двузначное минус однозначное с разменом')
        break
      case 7:
        assert(example.operation === 'subtract' && example.a >= 10 && example.b >= 10 && countBorrows(example.a, example.b) === 1, 'Уровень 7: двузначное вычитание с разменом')
        break
      case 8:
        assert(example.a >= 100 && example.a < 1000 && example.b >= 100 && example.b < 1000, 'Уровень 8: модель двух трёхзначных чисел')
        if (example.operation === 'add') assert(countCarries(example.a, example.b) === 0, 'Уровень 8: сложение по составу разрядов без переноса')
        else assert(countBorrows(example.a, example.b) === 0, 'Уровень 8: вычитание по разрядам без размена')
        break
      case 9:
        assert(example.operation === 'add' && example.a >= 100 && example.b >= 100 && countCarries(example.a, example.b) === 1, 'Уровень 9: трёхзначное сложение с одним переходом')
        break
      case 10:
        assert(example.operation === 'add' && countCarries(example.a, example.b) === 2, 'Уровень 10: трёхзначное сложение с двумя переходами')
        break
      case 11:
        assert(example.operation === 'subtract' && example.a >= 100 && countBorrows(example.a, example.b) === 1, 'Уровень 11: трёхзначное вычитание с одним разменом')
        break
      case 12:
        assert(example.operation === 'subtract' && countBorrows(example.a, example.b) > 0, 'Уровень 12: нужен размен через нулевой разряд')
        assert(hasBorrowThroughZero(example.a, example.b), 'Уровень 12: промежуточный ноль должен стать 9')
        break
      case 13:
        break
    }
  }
}

console.log(`Проверено: ${LEVELS.length} уровней × 600 примеров. Разрядные переходы соответствуют ограничениям последовательности.`)
