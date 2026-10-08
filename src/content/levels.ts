import type { Operation } from '../engine/column'

export type LevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13
export type DifficultyBand = 'двузначные' | 'трёхзначные' | 'смешанные'

export interface LevelInfo {
  id: LevelId
  title: string
  shortTitle: string
  description: string
  example: string
  band: DifficultyBand
  operation: Operation | 'mixed'
}

export interface Example {
  a: number
  b: number
  operation: Operation
  levelId: LevelId
}

export const LEVELS: readonly LevelInfo[] = [
  { id: 1, title: 'Сложение: без переноса', shortTitle: 'Двузначное + однозначное', description: 'Складываем единицы и десятки по очереди.', example: '23 + 5', band: 'двузначные', operation: 'add' },
  { id: 2, title: 'Складываем два числа', shortTitle: 'Двузначное + двузначное', description: 'Каждый разряд складываем отдельно.', example: '34 + 25', band: 'двузначные', operation: 'add' },
  { id: 3, title: 'Переносим десяток', shortTitle: 'Сложение с переходом', description: 'Если единиц больше девяти, переносим десяток.', example: '37 + 25', band: 'двузначные', operation: 'add' },
  { id: 4, title: 'Вычитаем единицы', shortTitle: 'Двузначное − однозначное', description: 'Вычитаем без займа у десятков.', example: '28 − 3', band: 'двузначные', operation: 'subtract' },
  { id: 5, title: 'Вычитаем два числа', shortTitle: 'Двузначное − двузначное', description: 'Начинаем с единиц и двигаемся влево.', example: '57 − 32', band: 'двузначные', operation: 'subtract' },
  { id: 6, title: 'Занимаем десяток', shortTitle: 'Вычитание с переходом', description: 'Занимаем один десяток, если единиц не хватает.', example: '42 − 27', band: 'двузначные', operation: 'subtract' },
  { id: 7, title: 'Три разряда', shortTitle: 'Трёхзначное сложение', description: 'Складываем единицы, десятки и сотни.', example: '123 + 456', band: 'трёхзначные', operation: 'add' },
  { id: 8, title: 'Один перенос', shortTitle: 'Сложение с одним переносом', description: 'Переносим один десяток или одну сотню.', example: '127 + 345', band: 'трёхзначные', operation: 'add' },
  { id: 9, title: 'Два переноса', shortTitle: 'Сложение с двумя переносами', description: 'Перенос может понадобиться в двух разрядах.', example: '176 + 255', band: 'трёхзначные', operation: 'add' },
  { id: 10, title: 'Вычитаем сотни', shortTitle: 'Трёхзначное вычитание', description: 'Вычитаем без займа между разрядами.', example: '578 − 234', band: 'трёхзначные', operation: 'subtract' },
  { id: 11, title: 'Занимаем десяток', shortTitle: 'Вычитание с переходом', description: 'Перегруппировываем единицы и десятки.', example: '543 − 217', band: 'трёхзначные', operation: 'subtract' },
  { id: 12, title: 'Через ноль', shortTitle: 'Займ через ноль', description: 'Учимся занимать через один или несколько нулей.', example: '500 − 127', band: 'трёхзначные', operation: 'subtract' },
  { id: 13, title: 'Математическая смесь', shortTitle: 'Сложение и вычитание', description: 'Повторяем знакомые правила на разных числах.', example: 'по-разному', band: 'смешанные', operation: 'mixed' }
] as const

export const LEVEL_BY_ID: Readonly<Record<LevelId, LevelInfo>> = Object.freeze(
  Object.fromEntries(LEVELS.map((level) => [level.id, level])) as Record<LevelId, LevelInfo>
)

function integer(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1))
}

function twoDigit(tens: number, units: number): number {
  return tens * 10 + units
}

function threeDigit(hundreds: number, tens: number, units: number): number {
  return hundreds * 100 + tens * 10 + units
}

function generateForLevel(id: Exclude<LevelId, 13>, random: () => number): Example {
  switch (id) {
    case 1: {
      const tens = integer(random, 1, 8)
      const units = integer(random, 0, 8)
      return { a: twoDigit(tens, units), b: integer(random, 1, 9 - units), operation: 'add', levelId: id }
    }
    case 2: {
      const tensA = integer(random, 1, 6)
      const tensB = integer(random, 1, 9 - tensA)
      const unitsA = integer(random, 0, 9)
      const unitsB = integer(random, 0, 9 - unitsA)
      return { a: twoDigit(tensA, unitsA), b: twoDigit(tensB, unitsB), operation: 'add', levelId: id }
    }
    case 3: {
      const unitsA = integer(random, 1, 9)
      const unitsB = integer(random, 10 - unitsA, 9)
      const tensA = integer(random, 1, 6)
      const tensB = integer(random, 1, 8 - tensA)
      return { a: twoDigit(tensA, unitsA), b: twoDigit(tensB, unitsB), operation: 'add', levelId: id }
    }
    case 4: {
      const unitsA = integer(random, 1, 9)
      return { a: twoDigit(integer(random, 1, 9), unitsA), b: integer(random, 1, unitsA), operation: 'subtract', levelId: id }
    }
    case 5: {
      const tensA = integer(random, 2, 9)
      const tensB = integer(random, 1, tensA - 1)
      const unitsA = integer(random, 0, 9)
      const unitsB = integer(random, 0, unitsA)
      return { a: twoDigit(tensA, unitsA), b: twoDigit(tensB, unitsB), operation: 'subtract', levelId: id }
    }
    case 6: {
      const tensB = integer(random, 1, 7)
      const tensA = integer(random, tensB + 1, 9)
      const unitsA = integer(random, 0, 8)
      const unitsB = integer(random, unitsA + 1, 9)
      return { a: twoDigit(tensA, unitsA), b: twoDigit(tensB, unitsB), operation: 'subtract', levelId: id }
    }
    case 7: {
      const hundredsA = integer(random, 1, 7)
      const hundredsB = integer(random, 1, 9 - hundredsA)
      const tensA = integer(random, 0, 9)
      const tensB = integer(random, 0, 9 - tensA)
      const unitsA = integer(random, 0, 9)
      const unitsB = integer(random, 0, 9 - unitsA)
      return { a: threeDigit(hundredsA, tensA, unitsA), b: threeDigit(hundredsB, tensB, unitsB), operation: 'add', levelId: id }
    }
    case 8: {
      const unitsA = integer(random, 1, 9)
      const unitsB = integer(random, 10 - unitsA, 9)
      const tensA = integer(random, 0, 7)
      const tensB = integer(random, 0, 8 - tensA)
      const hundredsA = integer(random, 1, 7)
      const hundredsB = integer(random, 1, 9 - hundredsA)
      return { a: threeDigit(hundredsA, tensA, unitsA), b: threeDigit(hundredsB, tensB, unitsB), operation: 'add', levelId: id }
    }
    case 9: {
      const unitsA = integer(random, 1, 9)
      const unitsB = integer(random, Math.max(1, 10 - unitsA), 9)
      const tensA = integer(random, 1, 7)
      const tensB = integer(random, Math.max(1, 9 - tensA), 9)
      const hundredsA = integer(random, 1, 7)
      const hundredsB = integer(random, 1, 8 - hundredsA)
      return { a: threeDigit(hundredsA, tensA, unitsA), b: threeDigit(hundredsB, tensB, unitsB), operation: 'add', levelId: id }
    }
    case 10: {
      const hundredsB = integer(random, 1, 8)
      const hundredsA = integer(random, hundredsB + 1, 9)
      const tensA = integer(random, 0, 9)
      const tensB = integer(random, 0, tensA)
      const unitsA = integer(random, 0, 9)
      const unitsB = integer(random, 0, unitsA)
      return { a: threeDigit(hundredsA, tensA, unitsA), b: threeDigit(hundredsB, tensB, unitsB), operation: 'subtract', levelId: id }
    }
    case 11: {
      const hundredsA = integer(random, 1, 9)
      const hundredsB = integer(random, 1, hundredsA)
      const tensA = integer(random, 1, 9)
      const tensB = integer(random, 0, tensA - 1)
      const unitsA = integer(random, 0, 8)
      const unitsB = integer(random, unitsA + 1, 9)
      return { a: threeDigit(hundredsA, tensA, unitsA), b: threeDigit(hundredsB, tensB, unitsB), operation: 'subtract', levelId: id }
    }
    case 12: {
      const patterns: ReadonlyArray<readonly [number, number]> = [
        [500, 127], [500, 284], [602, 348], [704, 189],
        [800, 236], [903, 158], [700, 256], [900, 482]
      ]
      const [a, b] = patterns[integer(random, 0, patterns.length - 1)]
      return { a, b, operation: 'subtract', levelId: id }
    }
  }
}

export function generateExample(levelId: LevelId, random: () => number = Math.random): Example {
  if (levelId === 13) {
    const sourceLevel = integer(random, 1, 12) as Exclude<LevelId, 13>
    return { ...generateForLevel(sourceLevel, random), levelId: 13 }
  }
  return generateForLevel(levelId, random)
}

export function getLevelInfo(levelId: LevelId): LevelInfo {
  return LEVEL_BY_ID[levelId]
}
