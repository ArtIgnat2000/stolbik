import type { ColumnAnalysis, ColumnStep } from '../../engine/column'

export type LessonMicroStepKind = 'calculate' | 'exchange' | 'write' | 'carry'

/** One child-facing action in a worked example or a self-check. */
export interface LessonMicroStep {
  id: string
  kind: LessonMicroStepKind
  place: number
  title: string
  text: string
  digit?: number
  fromPlace?: number
  toPlace?: number
}

const PLACE_LABELS: Readonly<Record<number, string>> = Object.freeze({
  0: 'Единицы',
  1: 'Десятки',
  2: 'Сотни',
  3: 'Тысячи'
})

const PLACE_COUNTS = [
  { one: 'единица', few: 'единицы', many: 'единиц' },
  { one: 'десяток', few: 'десятка', many: 'десятков' },
  { one: 'сотня', few: 'сотни', many: 'сотен' },
  { one: 'тысяча', few: 'тысячи', many: 'тысяч' }
] as const

const PLACE_UNITS_ACCUSATIVE: Readonly<Record<number, string>> = Object.freeze({
  0: 'единицу',
  1: 'десяток',
  2: 'сотню',
  3: 'тысячу'
})

const PLACE_DESTINATIONS: Readonly<Record<number, string>> = Object.freeze({
  0: 'единицы',
  1: 'десятки',
  2: 'сотни',
  3: 'тысячи'
})

const PLACE_UNITS_NOMINATIVE: Readonly<Record<number, string>> = Object.freeze({
  0: 'единица',
  1: 'десяток',
  2: 'сотня',
  3: 'тысяча'
})

function label(place: number): string {
  return PLACE_LABELS[place] ?? 'Разряд'
}

function placeCount(place: number, amount = 10): string {
  const forms = PLACE_COUNTS[place] ?? PLACE_COUNTS[0]
  const lastTwo = amount % 100
  const lastDigit = amount % 10
  if (lastTwo >= 11 && lastTwo <= 14) return forms.many
  if (lastDigit === 1) return forms.one
  if (lastDigit >= 2 && lastDigit <= 4) return forms.few
  return forms.many
}

function destination(place: number): string {
  return PLACE_DESTINATIONS[place] ?? 'единицы'
}

function makeStep(
  id: string,
  kind: LessonMicroStepKind,
  place: number,
  title: string,
  text: string,
  extra: Pick<LessonMicroStep, 'digit' | 'fromPlace' | 'toPlace'> = {}
): LessonMicroStep {
  return { id, kind, place, title, text, ...extra }
}

function addExchangeStep(place: number, index: number): LessonMicroStep {
  const nextPlace = place + 1
  const nextUnit = PLACE_UNITS_NOMINATIVE[nextPlace] ?? 'старший разряд'
  return makeStep(
    `exchange-${place}-${index}`,
    'exchange',
    place,
    `Собираем ${PLACE_UNITS_ACCUSATIVE[nextPlace] ?? 'старший разряд'}`,
    `10 ${placeCount(place)} = 1 ${nextUnit}.`,
    { fromPlace: place, toPlace: nextPlace }
  )
}

function exchangeText(fromPlace: number, toPlace: number): string {
  const from = PLACE_UNITS_NOMINATIVE[fromPlace] ?? 'единица'
  return `1 ${from} → 10 ${placeCount(toPlace)}.`
}

function recordText(step: ColumnStep): string {
  return `Запиши ${step.expectedDigit} в ${destination(step.place)}.`
}

function carryStep(step: ColumnStep): LessonMicroStep {
  const toPlace = step.place + 1
  const unit = PLACE_UNITS_ACCUSATIVE[toPlace] ?? 'единицу'
  return makeStep(
    `carry-${step.place}-${toPlace}`,
    'carry',
    toPlace,
    `Переносим ${unit}`,
    `Перенос: ${step.carryOut} ${placeCount(toPlace, step.carryOut)} → в разряд ${placeCount(toPlace)}.`,
    { fromPlace: step.place, toPlace }
  )
}

/**
 * Breaks a worked example into small, stable actions. In particular, a carry
 * and each borrow through a zero become their own visible steps rather than a
 * clause inside the calculation text.
 */
export function buildLessonMicroSteps(analysis: ColumnAnalysis): LessonMicroStep[] {
  const steps: LessonMicroStep[] = []
  let sequence = 0

  const push = (step: LessonMicroStep) => {
    sequence += 1
    steps.push({ ...step, id: `${step.id}-${sequence}` })
  }

  for (const step of analysis.inputSteps) {
    if (step.isFinalCarry) {
      push(makeStep(
        'write-final-carry',
        'write',
        step.place,
        `Записываем ${label(step.place).toLowerCase()}`,
        `Запиши цифру ${step.carryIn} в ${destination(step.place)}.`,
        { digit: step.expectedDigit }
      ))
      continue
    }

    if (analysis.operation === 'add') {
      const carry = step.carryIn > 0 ? ` + ${step.carryIn}` : ''
      push(makeStep(
        'calculate',
        'calculate',
        step.place,
        `Считаем ${label(step.place).toLowerCase()}`,
        `${step.aDigit} + ${step.bDigit}${carry} = ${step.subtotal} ${placeCount(step.place, step.subtotal)}.`
      ))

      if (step.carryOut > 0) push(addExchangeStep(step.place, sequence))

      push(makeStep(
        'write',
        'write',
        step.place,
        `Записываем ${label(step.place).toLowerCase()}`,
        recordText(step),
        { digit: step.expectedDigit }
      ))

      const hasFinalCarry = analysis.inputSteps.some((candidate) => candidate.isFinalCarry && candidate.place === step.place + 1)
      if (step.carryOut > 0 && !hasFinalCarry) push(carryStep(step))
      continue
    }

    if (step.borrow) {
      for (let fromPlace = step.borrow.fromPlace; fromPlace > step.place; fromPlace -= 1) {
        const toPlace = fromPlace - 1
        push(makeStep(
          `exchange-${fromPlace}-${toPlace}`,
          'exchange',
          step.place,
          `Обмениваем ${PLACE_UNITS_ACCUSATIVE[fromPlace] ?? 'единицу'}`,
          exchangeText(fromPlace, toPlace),
          { fromPlace, toPlace }
        ))
      }
    }

    push(makeStep(
      'calculate',
      'calculate',
      step.place,
      `Считаем ${label(step.place).toLowerCase()}`,
      `${step.aDigit} − ${step.bDigit} = ${step.expectedDigit} ${placeCount(step.place, step.expectedDigit)}.`
    ))
    push(makeStep(
      'write',
      'write',
      step.place,
      `Записываем ${label(step.place).toLowerCase()}`,
      recordText(step),
      { digit: step.expectedDigit }
    ))
  }

  return steps
}
