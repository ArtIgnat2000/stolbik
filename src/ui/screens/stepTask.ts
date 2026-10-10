import type { ColumnStep, Operation } from '../../engine/column'
import type { TokenTone } from '../components/PlaceTokens'
import { placeGenitive, placeTitle, tokenAccusative, tokenCount, tokenName, tokensMany } from '../placeNames'

/**
 * Один элемент наглядной строки: фишки разряда, знак действия или клеточка ответа.
 * Строка собирается из данных шага, поэтому текст и картинка никогда не расходятся.
 */
export type TaskSlot =
  | { kind: 'tokens'; place: number; count: number; tone: TokenTone; crossed?: boolean }
  | { kind: 'op'; text: string }
  | { kind: 'slot' }

/** Один размен: «1 треугольник → 10 точек». */
export interface TaskExchangeStep {
  from: TaskSlot[]
  to: TaskSlot[]
}

export interface TaskExchange {
  steps: TaskExchangeStep[]
  text: string
}

export interface StepTask {
  place: number
  placeTitle: string
  slots: TaskSlot[]
  /** Что сделать сейчас — прямая просьба к ребёнку. */
  question: string
  /** Почему так: размен, перенос или зачёркивание. */
  why: string | null
  exchange: TaskExchange | null
  /** Куда записать ответ. */
  instruction: string
}

function tokens(place: number, count: number, tone: TokenTone, crossed = false): TaskSlot {
  return { kind: 'tokens', place, count, tone, crossed }
}

function op(text: string): TaskSlot {
  return { kind: 'op', text }
}

function answerSlot(): TaskSlot {
  return { kind: 'slot' }
}

function instruction(place: number): string {
  return `Впиши цифру в разряд ${placeGenitive(place)}.`
}

function getFinalCarryTask(step: ColumnStep): StepTask {
  return {
    place: step.place,
    placeTitle: placeTitle(step.place),
    slots: [tokens(step.place, step.carryIn, 'carry'), op('='), answerSlot()],
    question: `Из прошлого разряда пришёл ${tokenCount(step.place, step.carryIn)}.`,
    why: `Когда в младшем разряде набирается десять ${tokenName(step.place - 1, 10)}, они становятся одним ${tokenName(step.place, 1)}.`,
    exchange: null,
    instruction: `${instruction(step.place)} Это последняя цифра ответа.`
  }
}

function getAdditionTask(step: ColumnStep): StepTask {
  const slots: TaskSlot[] = [
    tokens(step.place, step.aDigit, 'first'),
    op('+'),
    tokens(step.place, step.bDigit, 'second')
  ]
  const parts = [String(step.aDigit), String(step.bDigit)]
  if (step.carryIn > 0) {
    slots.push(op('+'), tokens(step.place, step.carryIn, 'carry'))
    parts.push(String(step.carryIn))
  }
  slots.push(op('='), answerSlot())

  let why: string | null = null
  let exchange: TaskExchange | null = null

  if (step.carryOut > 0) {
    why = `Десять ${tokenName(step.place, 10)} — это один ${tokenName(step.place + 1, 1)}. Один уйдёт в разряд ${placeGenitive(step.place + 1)}, а в этом разряде останется последняя цифра.`
    exchange = {
      steps: [
        {
          from: [tokens(step.place, 10, 'muted')],
          to: [tokens(step.place + 1, 1, 'carry')]
        }
      ],
      text: `10 ${tokenName(step.place, 10)} = 1 ${tokenName(step.place + 1, 1)}`
    }
  } else if (step.carryIn > 0) {
    why = `Сюда пришёл один ${tokenName(step.place, 1)}: в прошлом разряде набралось десять ${tokenName(step.place - 1, 10)}.`
  }

  return {
    place: step.place,
    placeTitle: placeTitle(step.place),
    slots,
    question: `Посчитай ${tokensMany(step.place)}: ${parts.join(' + ')} = ?`,
    why,
    exchange,
    instruction: instruction(step.place)
  }
}

function getSubtractionTask(step: ColumnStep): StepTask {
  const slots: TaskSlot[] = [
    tokens(step.place, step.aDigit, 'first'),
    op('−'),
    tokens(step.place, step.bDigit, 'second', true),
    op('='),
    answerSlot()
  ]

  if (!step.borrow) {
    return {
      place: step.place,
      placeTitle: placeTitle(step.place),
      slots,
      question: `Убери ${step.bDigit} ${tokenAccusative(step.place, step.bDigit)}. Сколько останется?`,
      why: 'Зачёркнутые фишки убираем из модели.',
      exchange: null,
      instruction: instruction(step.place)
    }
  }

  const fromPlace = step.borrow.fromPlace
  const steps: TaskExchangeStep[] = []
  for (let place = fromPlace; place > step.place; place -= 1) {
    steps.push({
      from: [tokens(place, 1, 'muted')],
      to: [tokens(place - 1, 10, 'carry')]
    })
  }

  const throughZero = fromPlace > step.place + 1
  const why = throughZero
    ? `В разряде ${placeGenitive(step.place + 1)} ноль, поэтому размен идёт из разряда ${placeGenitive(fromPlace)}. Стало ${step.aDigit} ${tokenName(step.place, step.aDigit)}.`
    : `Разменяем один ${tokenName(step.place + 1, 1)} на десять ${tokenName(step.place, 10)}: стало ${step.aDigit}.`

  return {
    place: step.place,
    placeTitle: placeTitle(step.place),
    slots,
    question: `Нужно убрать ${step.bDigit} ${tokenAccusative(step.place, step.bDigit)}, а в разряде только ${step.originalADigit}.`,
    why,
    exchange: {
      steps,
      text: steps
        .map((exchangeStep) => {
          const from = exchangeStep.from[0]
          const to = exchangeStep.to[0]
          if (from.kind !== 'tokens' || to.kind !== 'tokens') return ''
          return `1 ${tokenName(from.place, 1)} = 10 ${tokenName(to.place, 10)}`
        })
        .filter(Boolean)
        .join(', ')
    },
    instruction: instruction(step.place)
  }
}

/**
 * Описание текущего шага словами и фишками: что сделать, почему так и куда записать ответ.
 * Текст строится из тех же данных, что и картинка, поэтому они не расходятся.
 */
export function getStepTask(step: ColumnStep, operation: Operation): StepTask {
  if (step.isFinalCarry) return getFinalCarryTask(step)
  if (operation === 'add') return getAdditionTask(step)
  return getSubtractionTask(step)
}
