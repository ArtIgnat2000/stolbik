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
 * This is a narrow arithmetic module, not the complete Peterson grade-2 course.
 * Its 13-level order is an app-authored progression informed by public official
 * guidance and the current 2026/2027 grade-2 advanced-level textbook set. It is
 * not a page-by-page or lesson-by-lesson reproduction; see docs/peterson-methodology.md.
 */
export const LEVELS: readonly LevelInfo[] = [
  { id: 1, title: 'Складываем и вычитаем', shortTitle: 'Двузначные числа', description: 'Сначала сложим единицы, потом десятки. Посмотрим, как числа записаны в столбик.', example: '34 + 25 · 57 − 32', band: 'двузначные', operation: 'mixed' },
  { id: 2, title: 'Дополним до 10', shortTitle: '32 + 8 · 40 − 6', description: 'Сколько единиц не хватает до 10? Найдём ответ, а потом продолжим пример.', example: '32 + 8 · 40 − 6', band: 'двузначные', operation: 'mixed' },
  { id: 3, title: 'Считаем десятками', shortTitle: '21 + 39 · 40 − 26', description: 'Сложим числа по частям: сначала единицы, потом десятки.', example: '21 + 39 · 40 − 26', band: 'двузначные', operation: 'mixed' },
  { id: 4, title: 'Собираем десяток при сложении', shortTitle: '36 + 7 · 3 + 28', description: 'Сложи единицы. Если получится 10 или больше, собери десяток.', example: '36 + 7 · 3 + 28', band: 'двузначные', operation: 'add' },
  { id: 5, title: 'Складываем двузначные числа', shortTitle: '36 + 17', description: 'Сложи единицы, затем десятки. Если единиц больше 9, собери десяток.', example: '36 + 17', band: 'двузначные', operation: 'add' },
  { id: 6, title: 'Вычитаем, когда единиц не хватает', shortTitle: '32 − 5', description: 'Обменяй один десяток на 10 единиц. Тогда вычитать будет проще.', example: '32 − 5', band: 'двузначные', operation: 'subtract' },
  { id: 7, title: 'Вычитаем двузначные числа', shortTitle: '32 − 15', description: 'Вычти единицы, потом десятки. Если единиц не хватает, обменяй десяток.', example: '32 − 15', band: 'двузначные', operation: 'subtract' },
  { id: 8, title: 'Знакомимся с сотнями', shortTitle: 'Сотни, десятки, единицы', description: 'Разложи число на сотни, десятки и единицы.', example: '243 + 126 · 578 − 234', band: 'трёхзначные', operation: 'mixed' },
  { id: 9, title: 'Складываем трёхзначные числа', shortTitle: '204 + 138', description: 'Сначала сложи единицы, потом десятки и сотни.', example: '204 + 138', band: 'трёхзначные', operation: 'add' },
  { id: 10, title: 'Собираем десятки и сотни', shortTitle: '176 + 145', description: 'В примере соберём десяток и сотню по одному шагу.', example: '176 + 145', band: 'трёхзначные', operation: 'add' },
  { id: 11, title: 'Вычитаем трёхзначные числа', shortTitle: '243 − 114', description: 'Начни с единиц. Если их не хватает, обменяй один десяток на 10 единиц.', example: '243 − 114', band: 'трёхзначные', operation: 'subtract' },
  { id: 12, title: 'Вычитаем через ноль', shortTitle: '300 − 156', description: 'Если десятков нет, сначала обменяй сотню на 10 десятков. Потом продолжим.', example: '300 − 156', band: 'трёхзначные', operation: 'subtract' },
  { id: 13, title: 'Решаем и проверяем', shortTitle: 'Сложение и вычитание до 1000', description: 'Реши пример. Потом проверим ответ по одному шагу.', example: 'по-разному', band: 'смешанные', operation: 'mixed' }
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
