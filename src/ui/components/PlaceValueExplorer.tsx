import { useMemo, useState } from 'react'
import { buildPlaceValueActions, type PlaceValueAction } from '../../engine/placeValue'
import type { Operation } from '../../engine/column'

interface PlaceValueExplorerProps {
  a: number
  b: number
  operation: Operation
  onComplete: () => void
}

const PLACE_LABELS = ['единицы', 'десятки', 'сотни', 'тысячи'] as const
const PLACE_UNITS_NOMINATIVE = ['единица', 'десяток', 'сотня', 'тысяча'] as const
const PLACE_UNITS_ACCUSATIVE = ['единицу', 'десяток', 'сотню', 'тысячу'] as const
const PLACE_COUNTS = [
  { one: 'единица', few: 'единицы', many: 'единиц' },
  { one: 'десяток', few: 'десятка', many: 'десятков' },
  { one: 'сотня', few: 'сотни', many: 'сотен' },
  { one: 'тысяча', few: 'тысячи', many: 'тысяч' }
] as const
const PLACE_APPEAR_VERBS = ['Появилась', 'Появился', 'Появилась', 'Появилась'] as const

function placeLabel(place: number): string {
  return PLACE_LABELS[place] ?? 'разряд'
}

function placeUnit(place: number): string {
  return PLACE_UNITS_NOMINATIVE[place] ?? 'единица'
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

function amountLabel(amount: number, place: number): string {
  if (amount === 1) return `1 ${placeUnit(place)}`
  return `${amount} ${placeCount(place, amount)}`
}

function getActionTitle(action: PlaceValueAction): string {
  if (action.kind === 'combine') return `Считаем ${placeLabel(action.place)}`
  if (action.kind === 'regroup') return `Собираем ${PLACE_UNITS_ACCUSATIVE[action.toPlace] ?? 'единицу'}`
  if (action.kind === 'exchange') return `Обмениваем ${PLACE_UNITS_ACCUSATIVE[action.fromPlace] ?? 'единицу'}`
  return `Вычитаем ${placeLabel(action.place)}`
}

function getActionPrompt(action: PlaceValueAction): string {
  if (action.kind === 'combine') {
    const carry = action.carryIn > 0 ? ` + ${action.carryIn}` : ''
    return `Сложи ${placeLabel(action.place)}: ${action.aDigit} + ${action.bDigit}${carry}.`
  }
  if (action.kind === 'regroup') {
    return `10 ${placeCount(action.fromPlace)} = 1 ${placeUnit(action.toPlace)}.`
  }
  if (action.kind === 'exchange') {
    return `Обмен: 1 ${placeUnit(action.fromPlace)} → 10 ${placeCount(action.toPlace)}.`
  }
  return `Вычти ${action.amount} ${placeCount(action.place)} из ${action.available}.`
}

function getActionHint(action: PlaceValueAction | undefined): string {
  if (!action) return 'Посмотри на пример и на текущий шаг.'
  if (action.kind === 'combine') {
    const carry = action.carryIn > 0 ? ` и ещё ${action.carryIn}` : ''
    return `Посчитай ${action.aDigit} + ${action.bDigit}${carry}.`
  }
  if (action.kind === 'regroup') {
    return `10 ${placeCount(action.fromPlace)} — это 1 ${placeUnit(action.toPlace)}.`
  }
  if (action.kind === 'exchange') {
    return `1 ${placeUnit(action.fromPlace)} — это 10 ${placeCount(action.toPlace)}. При обмене число не меняется.`
  }
  return `Отсчитай ${action.amount} ${placeCount(action.place)} от ${action.available}.`
}

function getWrongAnswerMessage(action: PlaceValueAction): string {
  if (action.kind === 'combine') return `Проверь сумму: ${action.aDigit} + ${action.bDigit}${action.carryIn > 0 ? ` + ${action.carryIn}` : ''}.`
  if (action.kind === 'regroup') return `Нужно обменять ровно 10 ${placeCount(action.fromPlace)}.`
  if (action.kind === 'exchange') return `Посмотри на подсказку и повтори обмен.`
  return `Посчитай ещё раз: было ${action.available}, убери ${action.amount}.`
}

function getCorrectMessage(action: PlaceValueAction): string {
  if (action.kind === 'combine') return `Верно: получилось ${action.total} ${placeCount(action.place, action.total)}.`
  if (action.kind === 'regroup') return `Верно. Осталось ${amountLabel(action.unitsLeft, action.fromPlace)}. ${PLACE_APPEAR_VERBS[action.toPlace] ?? 'Появилась'} 1 ${placeUnit(action.toPlace)}.`
  if (action.kind === 'exchange') return `Верно. Теперь здесь ${action.targetBefore + 10} ${placeCount(action.toPlace, action.targetBefore + 10)}.`
  return `Верно: осталось ${action.remaining} ${placeCount(action.place, action.remaining)}.`
}

function getNumericAnswer(action: Extract<PlaceValueAction, { kind: 'combine' | 'remove' }>): number {
  return action.kind === 'combine' ? action.total : action.remaining
}

function rotateOptions<T>(options: T[], shift: number): T[] {
  const offset = shift % options.length
  return [...options.slice(offset), ...options.slice(0, offset)]
}

function getChoiceOptions(total: number, place: number): number[] {
  const options = total === 0 ? [0, 1, 2] : [total - 1, total, total + 1]
  return rotateOptions(options, total + place)
}

function ActionVisual({ action }: { action: PlaceValueAction }) {
  if (action.kind === 'combine') {
    return (
      <div className="model-action-visual model-action-equation" role="group" aria-label={`Сложение ${action.aDigit} и ${action.bDigit}${action.carryIn ? ` и ${action.carryIn}` : ''} ${placeLabel(action.place)}`}>
        <span className="model-amount"><strong>{action.aDigit}</strong><small>{placeLabel(action.place)}</small></span>
        <span className="model-operation-sign" aria-hidden="true">+</span>
        <span className="model-amount"><strong>{action.bDigit}</strong><small>{placeLabel(action.place)}</small></span>
        {action.carryIn > 0 && <><span className="model-operation-sign" aria-hidden="true">+</span><span className="model-amount"><strong>{action.carryIn}</strong><small>{placeUnit(action.place)}</small></span></>}
      </div>
    )
  }

  if (action.kind === 'regroup') {
    return (
      <div className="model-action-visual model-action-exchange" role="group" aria-label={`10 ${placeCount(action.fromPlace)} — 1 ${placeUnit(action.toPlace)}`}>
        <span className="model-amount"><strong>10</strong><small>{placeCount(action.fromPlace)}</small></span>
        <span className="model-operation-sign" aria-hidden="true">→</span>
        <span className="model-amount"><strong>1</strong><small>{placeUnit(action.toPlace)}</small></span>
      </div>
    )
  }

  if (action.kind === 'exchange') {
    return (
      <div className="model-action-visual model-action-exchange" role="group" aria-label={`Обмен: 1 ${placeUnit(action.fromPlace)} на 10 ${placeCount(action.toPlace)}`}>
        <span className="model-amount"><strong>1</strong><small>{placeUnit(action.fromPlace)}</small></span>
        <span className="model-operation-sign" aria-hidden="true">→</span>
        <span className="model-amount"><strong>10</strong><small>{placeCount(action.toPlace)}</small></span>
      </div>
    )
  }

  return (
    <div className="model-action-visual model-action-equation" role="group" aria-label={`${action.available} ${placeLabel(action.place)} минус ${action.amount}`}>
      <span className="model-amount"><strong>{action.available}</strong><small>{placeLabel(action.place)}</small></span>
      <span className="model-operation-sign" aria-hidden="true">−</span>
      <span className="model-amount"><strong>{action.amount}</strong><small>{placeLabel(action.place)}</small></span>
    </div>
  )
}

function ActionControls({
  action,
  answered,
  onAnswer,
  onExchange,
}: {
  action: PlaceValueAction
  answered: boolean
  onAnswer: (answer: number) => void
  onExchange: () => void
}) {
  if (action.kind === 'combine' || action.kind === 'remove') {
    const answer = getNumericAnswer(action)
    return (
      <div className="model-choice-list" role="group" aria-label={action.kind === 'combine' ? `Сколько ${placeCount(action.place)} получилось?` : `Сколько ${placeCount(action.place)} осталось?`}>
        {getChoiceOptions(answer, action.place).map((value) => (
          <button
            className={`model-choice-button${answered && value === answer ? ' model-choice-button-correct' : ''}`}
            data-testid={value === answer ? 'model-correct-choice' : undefined}
            type="button"
            key={value}
            disabled={answered}
            onClick={() => onAnswer(value)}
          >
            {value}
          </button>
        ))}
      </div>
    )
  }

  if (answered) {
    return <p className="model-action-done">Обмен выполнен ✓</p>
  }

  return (
    <button className="primary-button model-exchange-button" data-testid="model-exchange-action" type="button" onClick={onExchange}>
      {action.kind === 'regroup' ? 'Собрать десяток' : 'Сделать обмен'}
      <span aria-hidden="true">→</span>
    </button>
  )
}

export function PlaceValueExplorer({ a, b, operation, onComplete }: PlaceValueExplorerProps) {
  const actions = useMemo(() => buildPlaceValueActions(a, b, operation), [a, b, operation])
  const [actionIndex, setActionIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [feedbackTone, setFeedbackTone] = useState<'neutral' | 'correct' | 'retry' | 'hint'>('neutral')
  const [message, setMessage] = useState('')
  const [hintShown, setHintShown] = useState(false)
  const action = actions[actionIndex]
  const isComplete = actionIndex >= actions.length
  const operationSign = operation === 'add' ? '+' : '−'

  const markCorrect = () => {
    if (!action || answered) return
    setAnswered(true)
    setFeedbackTone('correct')
    setMessage(getCorrectMessage(action))
  }

  const handleAnswer = (value: number) => {
    if (!action || answered) return
    if (action.kind !== 'combine' && action.kind !== 'remove') return
    if (value === getNumericAnswer(action)) {
      markCorrect()
      return
    }
    setFeedbackTone('retry')
    setMessage(getWrongAnswerMessage(action))
  }

  const handleExchange = () => {
    markCorrect()
  }

  const nextAction = () => {
    setActionIndex((index) => index + 1)
    setAnswered(false)
    setFeedbackTone('neutral')
    setMessage('')
    setHintShown(false)
  }

  const showHint = () => {
    setFeedbackTone('hint')
    setMessage(getActionHint(action))
    setHintShown(true)
  }

  return (
    <section className="place-explorer-card" aria-labelledby="model-title">
      <header className="place-explorer-heading">
        <p className="eyebrow">РАЗБИРАЕМ ОДИН ПРИМЕР</p>
        <h1 id="model-title">{operation === 'add' ? 'Складываем' : 'Вычитаем'}</h1>
        <div className="model-example-pill" role="group" aria-label={`Пример: ${a} ${operation === 'add' ? 'плюс' : 'минус'} ${b}`}>
          <span data-testid="operand-a">{a}</span>
          <span aria-hidden="true">{operationSign}</span>
          <span data-testid="operand-b">{b}</span>
          <span className="visually-hidden" data-testid="model-operation">{operationSign}</span>
        </div>
      </header>

      {isComplete ? (
        <div className="model-current-card model-complete-card">
          <span className="model-step-badge">ГОТОВО</span>
          <h2>Модель готова!</h2>
          <p>Теперь посмотрим, как записать этот пример столбиком.</p>
          <button className="primary-button model-finish-button" type="button" onClick={onComplete}>
            Перейти к записи в столбик <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : action ? (
        <div className="model-current-card">
          <div className="model-current-heading">
            <span className="model-step-badge">ШАГ {actionIndex + 1} ИЗ {actions.length}</span>
            <h2>{getActionTitle(action)}</h2>
            <strong aria-live="polite">{getActionPrompt(action)}</strong>
          </div>

          <ActionVisual action={action} />

          {action.kind === 'regroup' && action.unitsLeft > 0 && (
            <p className="model-leftover-note">После обмена останется {amountLabel(action.unitsLeft, action.fromPlace)}.</p>
          )}

          <ActionControls action={action} answered={answered} onAnswer={handleAnswer} onExchange={handleExchange} />

          {message && (
            <p className={`model-feedback model-feedback-${feedbackTone}`} role="status" aria-live="polite" aria-atomic="true">
              <span className="model-feedback-icon" aria-hidden="true">{feedbackTone === 'correct' ? '✓' : feedbackTone === 'retry' ? '↻' : '💡'}</span>
              <span>{message}</span>
            </p>
          )}

          {answered ? (
            <button className="primary-button model-next-button" type="button" onClick={nextAction}>
              Дальше <span aria-hidden="true">→</span>
            </button>
          ) : (
            <button className="text-button model-hint-button" type="button" onClick={showHint} aria-pressed={hintShown}>
              {hintShown ? 'Показать подсказку ещё раз' : 'Нужна подсказка?'}
            </button>
          )}
        </div>
      ) : (
        <div className="model-current-card model-complete-card">
          <h2>В этом примере нет действий для модели.</h2>
          <button className="primary-button model-finish-button" type="button" onClick={onComplete}>Перейти к записи в столбик →</button>
        </div>
      )}
    </section>
  )
}
