export type Operation = 'add' | 'subtract'

export type Place = 0 | 1 | 2 | 3

export interface DigitChange {
  place: number
  before: number
  after: number
}

export interface BorrowInfo {
  fromPlace: number
  changes: DigitChange[]
}

export interface ColumnStep {
  place: number
  placeName: string
  aDigit: number
  originalADigit: number
  bDigit: number
  expectedDigit: number
  subtotal: number
  carryIn: number
  carryOut: number
  borrow?: BorrowInfo
  isFinalCarry?: boolean
  explanation: string
}

export interface ColumnAnalysis {
  a: number
  b: number
  operation: Operation
  result: number
  resultDigits: number[]
  answerLength: number
  columnCount: number
  steps: ColumnStep[]
  inputSteps: ColumnStep[]
}

const PLACE_NAMES: Readonly<Record<number, string>> = Object.freeze({
  0: 'единиц',
  1: 'десятков',
  2: 'сотен',
  3: 'тысяч'
})

function getDigit(value: number, place: number): number {
  return Math.floor(value / 10 ** place) % 10
}

function numberLength(value: number): number {
  return Math.max(1, String(Math.abs(value)).length)
}

function placeName(place: number): string {
  return PLACE_NAMES[place] ?? 'старших разрядов'
}

function carriedUnits(count: number): string {
  if (count === 1) return 'одна перенесённая единица'
  if (count >= 2 && count <= 4) return `${count} перенесённые единицы`
  return `${count} перенесённых единиц`
}

function makeAdditionExplanation(
  place: number,
  aDigit: number,
  bDigit: number,
  carryIn: number,
  subtotal: number,
  expectedDigit: number,
  carryOut: number
): string {
  const carryPart = carryIn > 0 ? ` и ${carriedUnits(carryIn)}` : ''
  const calculation = `${aDigit} + ${bDigit}${carryPart} = ${subtotal}`
  if (carryOut > 0) {
    const nextName = placeName(place + 1)
    return `В разряде ${placeName(place)}: ${calculation}. В ответ пишем ${expectedDigit}, а ${carryOut} переносим в разряд ${nextName}.`
  }
  return `В разряде ${placeName(place)}: ${calculation}. В ответ пишем ${expectedDigit}.`
}

function makeFinalCarryExplanation(place: number, digit: number): string {
  return `Перенесённую ${digit} записываем в разряд ${placeName(place)}. Это последняя цифра ответа.`
}

function makeSubtractionExplanation(
  place: number,
  digitBeforeBorrow: number,
  digitAfterBorrow: number,
  bDigit: number,
  borrow: BorrowInfo | undefined,
  expectedDigit: number
): string {
  if (!borrow) {
    return `В разряде ${placeName(place)}: ${digitAfterBorrow} − ${bDigit} = ${expectedDigit}.`
  }
  const sourceName = placeName(borrow.fromPlace)
  const changesText = borrow.changes
    .filter((change) => change.place !== place)
    .map((change) => `${change.before} становится ${change.after} в разряде ${placeName(change.place)}`)
    .join(', а ')
  const bridge = changesText ? ` Берём 1 из разряда ${sourceName}: ${changesText}.` : ` Берём 1 из разряда ${sourceName}.`
  return `${digitBeforeBorrow} меньше, чем ${bDigit}.${bridge} Здесь стало ${digitAfterBorrow}: ${digitAfterBorrow} − ${bDigit} = ${expectedDigit}. В ответ пишем ${expectedDigit}.`
}

export function analyzeColumn(a: number, b: number, operation: Operation): ColumnAnalysis {
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || a < 0 || b < 0) {
    throw new RangeError('Для столбика нужны неотрицательные целые числа.')
  }
  if (operation === 'subtract' && a < b) {
    throw new RangeError('Уменьшаемое не может быть меньше вычитаемого.')
  }

  const result = operation === 'add' ? a + b : a - b
  const inputColumnCount = Math.max(numberLength(a), numberLength(b))
  const steps: ColumnStep[] = []

  if (operation === 'add') {
    let carry = 0
    for (let place = 0; place < inputColumnCount; place += 1) {
      const aDigit = getDigit(a, place)
      const bDigit = getDigit(b, place)
      const carryIn = carry
      const subtotal = aDigit + bDigit + carryIn
      const expectedDigit = subtotal % 10
      const carryOut = Math.floor(subtotal / 10)
      steps.push({
        place,
        placeName: placeName(place),
        aDigit,
        originalADigit: aDigit,
        bDigit,
        expectedDigit,
        subtotal,
        carryIn,
        carryOut,
        explanation: makeAdditionExplanation(place, aDigit, bDigit, carryIn, subtotal, expectedDigit, carryOut)
      })
      carry = carryOut
    }
    if (carry > 0) {
      const place = inputColumnCount
      steps.push({
        place,
        placeName: placeName(place),
        aDigit: 0,
        originalADigit: 0,
        bDigit: 0,
        expectedDigit: carry,
        subtotal: carry,
        carryIn: carry,
        carryOut: 0,
        isFinalCarry: true,
        explanation: makeFinalCarryExplanation(place, carry)
      })
    }
  } else {
    const workingDigits = Array.from({ length: inputColumnCount }, (_, place) => getDigit(a, place))
    for (let place = 0; place < inputColumnCount; place += 1) {
      const originalADigit = getDigit(a, place)
      const bDigit = getDigit(b, place)
      const digitBeforeBorrow = workingDigits[place]
      let borrow: BorrowInfo | undefined
      if (workingDigits[place] < bDigit) {
        let fromPlace = place + 1
        while (fromPlace < inputColumnCount && workingDigits[fromPlace] === 0) fromPlace += 1
        if (fromPlace >= inputColumnCount) {
          throw new Error('Не удалось занять у старшего разряда.')
        }
        const changes: DigitChange[] = []
        const sourceBefore = workingDigits[fromPlace]
        workingDigits[fromPlace] -= 1
        changes.push({ place: fromPlace, before: sourceBefore, after: workingDigits[fromPlace] })
        for (let changedPlace = fromPlace - 1; changedPlace > place; changedPlace -= 1) {
          const before = workingDigits[changedPlace]
          workingDigits[changedPlace] = 9
          changes.push({ place: changedPlace, before, after: 9 })
        }
        const currentBefore = workingDigits[place]
        workingDigits[place] += 10
        changes.push({ place, before: currentBefore, after: workingDigits[place] })
        borrow = { fromPlace, changes }
      }
      const currentDigit = workingDigits[place]
      const expectedDigit = currentDigit - bDigit
      steps.push({
        place,
        placeName: placeName(place),
        aDigit: currentDigit,
        originalADigit,
        bDigit,
        expectedDigit,
        subtotal: currentDigit - bDigit,
        carryIn: 0,
        carryOut: 0,
        borrow,
        explanation: makeSubtractionExplanation(place, digitBeforeBorrow, currentDigit, bDigit, borrow, expectedDigit)
      })
    }
  }

  const answerLength = numberLength(result)
  const resultDigits = Array.from({ length: answerLength }, (_, index) => getDigit(result, index))
  const inputSteps = operation === 'subtract'
    ? steps.filter((step) => step.place < answerLength)
    : steps

  return {
    a,
    b,
    operation,
    result,
    resultDigits,
    answerLength,
    columnCount: Math.max(inputColumnCount, answerLength),
    steps,
    inputSteps
  }
}

export function formatOperation(operation: Operation): string {
  return operation === 'add' ? 'плюс' : 'минус'
}
