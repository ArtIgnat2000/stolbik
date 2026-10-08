import type { Operation } from '../engine/column'

export type LevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13
export type DifficultyBand = 'двузначные' | 'трёхзначные' | 'смешанные'
export type LevelOperation = Operation | 'mixed'

export interface LevelInfo {
  id: LevelId
  title: string
  shortTitle: string
  description: string
  example: string
  band: DifficultyBand
  operation: LevelOperation
}

export interface Example {
  a: number
  b: number
  operation: Operation
  levelId: LevelId
}

/**
 * This is an arithmetic module, not a claim to cover the complete Peterson
 * grade-2 course. Its order follows the official grade-2 sequence for written
 * addition/subtraction: two-digit methods, transition through a ten, place-value
 * work with three-digit numbers, then addition and subtraction with regrouping.
 */
export const LEVELS: readonly LevelInfo[] = [
  { id: 1, title: 'Вспоминаем сложение и вычитание', shortTitle: 'Двузначные числа: запись в столбик', description: 'Сопоставляем десятки с десятками, единицы с единицами и объясняем, почему начинаем с единиц.', example: '34 + 25 · 57 − 32', band: 'двузначные', operation: 'mixed' },
  { id: 2, title: 'Дополняем до круглого десятка', shortTitle: '32 + 8 · 40 − 6', description: 'Исследуем, как единицы дополняют десяток и как действовать, если целое — круглый десяток.', example: '32 + 8 · 40 − 6', band: 'двузначные', operation: 'mixed' },
  { id: 3, title: 'Действия с круглыми десятками', shortTitle: '21 + 39 · 40 − 26', description: 'Исследуем состав числа и то, как разрядная модель помогает получить или вычесть круглый десяток.', example: '21 + 39 · 40 − 26', band: 'двузначные', operation: 'mixed' },
  { id: 4, title: 'Сложение с переходом через десяток', shortTitle: '36 + 7 · 3 + 28', description: 'Объединяем единицы и выясняем, как представить десять единиц одним десятком.', example: '36 + 7 · 3 + 28', band: 'двузначные', operation: 'add' },
  { id: 5, title: 'Складываем двузначные числа с переходом', shortTitle: '36 + 17', description: 'Складываем единицы и десятки, объясняя размен десяти единиц на один десяток.', example: '36 + 17', band: 'двузначные', operation: 'add' },
  { id: 6, title: 'Вычитание с переходом через десяток', shortTitle: '32 − 5', description: 'Если единиц не хватает, исследуем размен одного десятка на десять единиц.', example: '32 − 5', band: 'двузначные', operation: 'subtract' },
  { id: 7, title: 'Вычитаем двузначные числа с разменом', shortTitle: '32 − 15', description: 'Моделируем размен десятка и по отдельности рассматриваем единицы и десятки.', example: '32 − 15', band: 'двузначные', operation: 'subtract' },
  { id: 8, title: 'Сотни, десятки и единицы', shortTitle: 'Модель трёхзначного числа', description: 'Представляем трёхзначные числа как сумму разрядных единиц и сравниваем их состав.', example: '243 + 126 · 578 − 234', band: 'трёхзначные', operation: 'mixed' },
  { id: 9, title: 'Сложение трёхзначных чисел', shortTitle: '204 + 138', description: 'Собираем разрядные группы и один раз перегруппировываем десять единиц.', example: '204 + 138', band: 'трёхзначные', operation: 'add' },
  { id: 10, title: 'Сложение с несколькими переходами', shortTitle: '176 + 145', description: 'Последовательно моделируем перенос из единиц в десятки и из десятков в сотни.', example: '176 + 145', band: 'трёхзначные', operation: 'add' },
  { id: 11, title: 'Вычитание трёхзначных чисел', shortTitle: '243 − 114', description: 'Проверяем каждый разряд и разменяем единицу старшего разряда там, где её не хватает.', example: '243 − 114', band: 'трёхзначные', operation: 'subtract' },
  { id: 12, title: 'Вычитание через нулевой разряд', shortTitle: '300 − 156', description: 'Показываем последовательный размен через нули: промежуточные разряды становятся 9.', example: '300 − 156', band: 'трёхзначные', operation: 'subtract' },
  { id: 13, title: 'Смешанные примеры и самопроверка', shortTitle: 'Сложение и вычитание до 1000', description: 'Выбираем подходящую модель, применяем способ и сверяем каждый шаг с эталоном.', example: 'по-разному', band: 'смешанные', operation: 'mixed' }
] as const

export const LEVEL_BY_ID: Readonly<Record<LevelId, LevelInfo>> = Object.freeze(
  Object.fromEntries(LEVELS.map((level) => [level.id, level])) as Record<LevelId, LevelInfo>
)

function integer(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1))
}

function chooseAdd(random: () => number): boolean {
  return random() < 0.5
}

function twoDigit(tens: number, units: number): number {
  return tens * 10 + units
}

function threeDigit(hundreds: number, tens: number, units: number): number {
  return hundreds * 100 + tens * 10 + units
}

function generateForLevel(id: LevelId, random: () => number): Example {
  switch (id) {
    case 1: {
      if (chooseAdd(random)) {
        const tensA = integer(random, 1, 6)
        const tensB = integer(random, 1, 8 - tensA)
        const unitsA = integer(random, 0, 8)
        const unitsB = integer(random, 0, 9 - unitsA)
        return { a: twoDigit(tensA, unitsA), b: twoDigit(tensB, unitsB), operation: 'add', levelId: id }
      }
      const tensB = integer(random, 1, 7)
      const tensA = integer(random, tensB + 1, 9)
      const unitsA = integer(random, 0, 9)
      const unitsB = integer(random, 0, unitsA)
      return { a: twoDigit(tensA, unitsA), b: twoDigit(tensB, unitsB), operation: 'subtract', levelId: id }
    }
    case 2: {
      if (chooseAdd(random)) {
        const tens = integer(random, 1, 8)
        const units = integer(random, 1, 9)
        return { a: twoDigit(tens, units), b: 10 - units, operation: 'add', levelId: id }
      }
      const tens = integer(random, 2, 9)
      return { a: tens * 10, b: integer(random, 1, 9), operation: 'subtract', levelId: id }
    }
    case 3: {
      if (chooseAdd(random)) {
        const unitsA = integer(random, 1, 9)
        const unitsB = 10 - unitsA
        const tensA = integer(random, 1, 6)
        const tensB = integer(random, 1, 8 - tensA)
        return { a: twoDigit(tensA, unitsA), b: twoDigit(tensB, unitsB), operation: 'add', levelId: id }
      }
      const tensA = integer(random, 2, 9)
      const tensB = integer(random, 1, tensA - 1)
      return { a: tensA * 10, b: twoDigit(tensB, integer(random, 1, 9)), operation: 'subtract', levelId: id }
    }
    case 4: {
      const tens = integer(random, 1, 8)
      const unitsA = integer(random, 1, 9)
      const unitsB = integer(random, 10 - unitsA, 9)
      const reversed = random() >= 0.5
      return reversed
        ? { a: unitsA, b: twoDigit(tens, unitsB), operation: 'add', levelId: id }
        : { a: twoDigit(tens, unitsA), b: unitsB, operation: 'add', levelId: id }
    }
    case 5: {
      const tensA = integer(random, 1, 7)
      const tensB = integer(random, 1, 8 - tensA)
      const unitsA = integer(random, 1, 9)
      const unitsB = integer(random, 10 - unitsA, 9)
      return { a: twoDigit(tensA, unitsA), b: twoDigit(tensB, unitsB), operation: 'add', levelId: id }
    }
    case 6: {
      const tens = integer(random, 2, 9)
      const unitsA = integer(random, 0, 8)
      return { a: twoDigit(tens, unitsA), b: integer(random, unitsA + 1, 9), operation: 'subtract', levelId: id }
    }
    case 7: {
      const tensB = integer(random, 1, 7)
      const tensA = integer(random, tensB + 1, 9)
      const unitsA = integer(random, 0, 8)
      const unitsB = integer(random, unitsA + 1, 9)
      return { a: twoDigit(tensA, unitsA), b: twoDigit(tensB, unitsB), operation: 'subtract', levelId: id }
    }
    case 8: {
      if (chooseAdd(random)) {
        const hundredsA = integer(random, 1, 7)
        const hundredsB = integer(random, 1, 9 - hundredsA)
        const tensA = integer(random, 0, 8)
        const tensB = integer(random, 0, 9 - tensA)
        const unitsA = integer(random, 0, 8)
        const unitsB = integer(random, 0, 9 - unitsA)
        return { a: threeDigit(hundredsA, tensA, unitsA), b: threeDigit(hundredsB, tensB, unitsB), operation: 'add', levelId: id }
      }
      const hundredsA = integer(random, 2, 9)
      const hundredsB = integer(random, 1, hundredsA - 1)
      const tensA = integer(random, 0, 9)
      const tensB = integer(random, 0, tensA)
      const unitsA = integer(random, 0, 9)
      const unitsB = integer(random, 0, unitsA)
      return { a: threeDigit(hundredsA, tensA, unitsA), b: threeDigit(hundredsB, tensB, unitsB), operation: 'subtract', levelId: id }
    }
    case 9: {
      const unitsA = integer(random, 1, 9)
      const unitsB = integer(random, 10 - unitsA, 9)
      const tensA = integer(random, 0, 7)
      const tensB = integer(random, 0, 8 - tensA)
      const hundredsA = integer(random, 1, 7)
      const hundredsB = integer(random, 1, 9 - hundredsA)
      return { a: threeDigit(hundredsA, tensA, unitsA), b: threeDigit(hundredsB, tensB, unitsB), operation: 'add', levelId: id }
    }
    case 10: {
      const unitsA = integer(random, 1, 9)
      const unitsB = integer(random, 10 - unitsA, 9)
      const tensA = integer(random, 1, 7)
      const tensB = integer(random, 9 - tensA, 8)
      const hundredsA = integer(random, 1, 6)
      const hundredsB = integer(random, 1, 8 - hundredsA)
      return { a: threeDigit(hundredsA, tensA, unitsA), b: threeDigit(hundredsB, tensB, unitsB), operation: 'add', levelId: id }
    }
    case 11: {
      const examples: ReadonlyArray<readonly [number, number]> = [
        [243, 114], [316, 152], [432, 218], [562, 147], [724, 318], [634, 251]
      ]
      const [a, b] = examples[integer(random, 0, examples.length - 1)]!
      return { a, b, operation: 'subtract', levelId: id }
    }
    case 12: {
      const examples: ReadonlyArray<readonly [number, number]> = [
        [300, 156], [500, 127], [500, 284], [602, 348],
        [704, 189], [800, 236], [903, 158], [700, 256], [900, 482]
      ]
      const [a, b] = examples[integer(random, 0, examples.length - 1)]!
      return { a, b, operation: 'subtract', levelId: id }
    }
    case 13: {
      const sourceLevel = integer(random, 1, 12) as Exclude<LevelId, 13>
      const example = generateForLevel(sourceLevel, random)
      return { ...example, levelId: id }
    }
  }
}

export function generateExample(levelId: LevelId, random: () => number = Math.random): Example {
  return generateForLevel(levelId, random)
}

export function getLevelInfo(levelId: LevelId): LevelInfo {
  return LEVEL_BY_ID[levelId]
}
