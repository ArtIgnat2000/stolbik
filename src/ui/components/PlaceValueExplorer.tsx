import { useMemo, useState } from 'react'
import { buildPlaceValueActions, getPlaceName, type PlaceValueAction } from '../../engine/placeValue'
import type { Operation } from '../../engine/column'

interface PlaceValueExplorerProps {
  a: number
  b: number
  operation: Operation
  onComplete: () => void
}

const PLACE_SYMBOLS = ['•', '△', '△', '△'] as const
const PLACE_LABELS = ['единицы', 'десятки', 'сотни', 'тысячи'] as const
const PLACE_FORMS = [
  { one: 'единицу', few: 'единицы', many: 'единиц', countOne: 'единица', genOne: 'единицы', oneWord: 'одну' },
  { one: 'десяток', few: 'десятка', many: 'десятков', countOne: 'десяток', genOne: 'десятка', oneWord: 'один' },
  { one: 'сотню', few: 'сотни', many: 'сотен', countOne: 'сотня', genOne: 'сотни', oneWord: 'одну' },
  { one: 'тысячу', few: 'тысячи', many: 'тысяч', countOne: 'тысяча', genOne: 'тысячи', oneWord: 'одну' }
] as const

function getFormIndex(amount: number): 0 | 1 | 2 {
  const lastTwo = amount % 100
  const last = amount % 10
  return lastTwo >= 11 && lastTwo <= 14 ? 2 : last === 1 ? 0 : last >= 2 && last <= 4 ? 1 : 2
}

/** Счётное сочетание в винительном падеже: «убери 5 единиц», «обменять одну единицу». */
function amountLabel(amount: number, place: number): string {
  const forms = PLACE_FORMS[place] ?? PLACE_FORMS[0]
  const formIndex = getFormIndex(amount)
  const word = formIndex === 0 ? forms.one : formIndex === 1 ? forms.few : forms.many
  return formIndex === 0 ? `${forms.oneWord} ${word}` : `${amount} ${word}`
}

/** Название разряда в именительном падеже: «3 единицы», «1 десяток». */
function countLabel(amount: number, place: number): string {
  const forms = PLACE_FORMS[place] ?? PLACE_FORMS[0]
  const formIndex = getFormIndex(amount)
  const word = formIndex === 0 ? forms.countOne : formIndex === 1 ? forms.few : forms.many
  return `${amount} ${word}`
}

/** Родительный падеж после «из»: «из 1 единицы», «из 3 единиц». */
function genitiveLabel(amount: number, place: number): string {
  const forms = PLACE_FORMS[place] ?? PLACE_FORMS[0]
  const formIndex = getFormIndex(amount)
  const word = formIndex === 0 ? forms.genOne : forms.many
  return `${amount} ${word}`
}

function digitAt(value: number, place: number): number {
  return Math.floor(value / 10 ** place) % 10
}

function tokenCountLabel(count: number, token: 'point' | 'triangle'): string {
  const forms = token === 'point'
    ? ['точка', 'точки', 'точек']
    : ['треугольник', 'треугольника', 'треугольников']
  return `${count} ${forms[getFormIndex(count)]}`
}

function describeTokens(value: number, place: number): string {
  const count = digitAt(value, place)
  if (place === 2) return tokenCountLabel(count * 10, 'triangle')
  if (place === 1) return tokenCountLabel(count, 'triangle')
  if (place === 0) return tokenCountLabel(count, 'point')
  return tokenCountLabel(count * 100, 'triangle')
}

function describeCurrentModel(count: number, place: number): string {
  if (place === 2) return `${countLabel(count, place)} — ${tokenCountLabel(count * 10, 'triangle')}`
  if (place === 1) return `${countLabel(count, place)} — ${tokenCountLabel(count, 'triangle')}`
  if (place === 0) return `${countLabel(count, place)} — ${tokenCountLabel(count, 'point')}`
  return countLabel(count, 3)
}

function getCurrentCounts(a: number, b: number, operation: Operation, actions: readonly PlaceValueAction[], beforeIndex: number): number[] {
  const places = Math.max(String(a).length, String(b).length) + 1
  const counts = Array.from({ length: places }, (_, place) => (
    operation === 'add' ? digitAt(a, place) + digitAt(b, place) : digitAt(a, place)
  ))
  for (const action of actions.slice(0, beforeIndex)) {
    if (action.kind === 'regroup') {
      counts[action.fromPlace] = (counts[action.fromPlace] ?? 0) - 10
      counts[action.toPlace] = (counts[action.toPlace] ?? 0) + 1
    } else if (action.kind === 'exchange') {
      counts[action.fromPlace] = (counts[action.fromPlace] ?? 0) - 1
      counts[action.toPlace] = (counts[action.toPlace] ?? 0) + 10
    } else if (action.kind === 'remove') {
      counts[action.place] = (counts[action.place] ?? 0) - action.amount
    }
  }
  return counts
}

function getActionPrompt(action: PlaceValueAction): string {
  if (action.kind === 'combine') {
    const place = PLACE_LABELS[action.place] ?? 'разряд'
    const carry = action.carryIn > 0 ? ` + ${action.carryIn} (перенос)` : ''
    return `Сложи ${place}: ${action.aDigit} + ${action.bDigit}${carry}. Сколько получится?`
  }
  if (action.kind === 'regroup') {
    const total = action.groupsOfTen * 10 + action.unitsLeft
    return `Получилось ${total} ${getPlaceName(action.fromPlace)}. 10 ${getPlaceName(action.fromPlace)} можно обменять на ${amountLabel(1, action.toPlace)}. Выбери этот обмен.`
  }
  if (action.kind === 'exchange') {
    return `В разряде ${getPlaceName(action.toPlace)} сейчас ${action.targetBefore}. Как получить здесь 10 ${getPlaceName(action.toPlace)}? Выбери нужный размен.`
  }
  return `Было ${countLabel(action.available, action.place)}. Убери ${amountLabel(action.amount, action.place)}. Сколько останется?`
}

function getActionLabel(action: PlaceValueAction): string {
  if (action.kind === 'regroup') {
    return `Объединить ${amountLabel(10, action.fromPlace)} в ${amountLabel(1, action.toPlace)}`
  }
  if (action.kind === 'exchange') {
    return `Обменять ${amountLabel(1, action.fromPlace)} на ${amountLabel(10, action.toPlace)}`
  }
  if (action.kind === 'remove') return `Убрать ${amountLabel(action.amount, action.place)}`
  return ''
}

function rotateOptions<T>(options: T[], shift: number): T[] {
  const offset = shift % options.length
  return [...options.slice(offset), ...options.slice(0, offset)]
}

function getChoiceOptions(total: number, place: number): number[] {
  const options = total === 0 ? [0, 1, 2] : [total - 1, total, total + 1]
  return rotateOptions(options, total + place)
}

function getExchangeChoices(action: Extract<PlaceValueAction, { kind: 'regroup' | 'exchange' }>): string[] {
  const correct = getActionLabel(action)
  const wrong = action.kind === 'regroup'
    ? [
        `Объединить ${amountLabel(1, action.fromPlace)} в ${amountLabel(1, action.toPlace)}`,
        `Объединить ${amountLabel(10, action.fromPlace)} в ${amountLabel(1, action.toPlace + 1)}`
      ]
    : [
        `Обменять ${amountLabel(10, action.toPlace)} на ${amountLabel(1, action.fromPlace)}`,
        `Обменять ${amountLabel(1, action.fromPlace)} на ${amountLabel(1, action.toPlace)}`
      ]
  return rotateOptions([correct, ...wrong], action.fromPlace + action.toPlace)
}

function getActionHint(action: PlaceValueAction | undefined): string {
  if (!action) return 'Посмотри на фишки и выполни задание над ними.'
  if (action.kind === 'combine') return 'Сосчитай фишки в этом разряде. Если был перенос, прибавь ещё одну фишку.'
  if (action.kind === 'regroup') return `Каждые 10 ${getPlaceName(action.fromPlace)} можно обменять на ${amountLabel(1, action.toPlace)}.`
  if (action.kind === 'exchange') return `Размен сохраняет число: ${amountLabel(1, action.fromPlace)} можно обменять на 10 ${getPlaceName(action.toPlace)}.`
  return `Убери ${amountLabel(action.amount, action.place)} из ${genitiveLabel(action.available, action.place)} и посчитай остаток.`
}

function getWrongAnswerMessage(action: PlaceValueAction): string {
  if (action.kind === 'combine') {
    const carry = action.carryIn > 0 ? ` + ${action.carryIn} (перенос)` : ''
    return `Ответ не совпал. Проверь сумму: ${action.aDigit} + ${action.bDigit}${carry}. Попробуй ещё раз.`
  }
  if (action.kind === 'regroup') {
    return `Ответ не совпал. Вспомни: 10 ${getPlaceName(action.fromPlace)} можно обменять на ${amountLabel(1, action.toPlace)}. Попробуй ещё раз.`
  }
  if (action.kind === 'exchange') {
    return `Ответ не совпал. Размен должен сохранить число. Подумай, какую фишку меняют на 10 ${getPlaceName(action.toPlace)}, и выбери обмен ещё раз.`
  }
  return `Ответ не совпал. Из ${genitiveLabel(action.available, action.place)} убери ${amountLabel(action.amount, action.place)} и пересчитай остаток. Попробуй ещё раз.`
}

function isActionPlace(action: PlaceValueAction | undefined, place: number): boolean {
  if (!action) return false
  if (action.kind === 'combine' || action.kind === 'remove') return action.place === place
  return action.fromPlace === place || action.toPlace === place
}

function renderAction(action: PlaceValueAction, onAdvance: () => void, onWrong: () => void) {
  if (action.kind === 'combine' || action.kind === 'remove') {
    const answer = action.kind === 'combine' ? action.total : action.remaining
    const place = action.place
    const options = getChoiceOptions(answer, place)
    return (
      <div className="model-choice-list" role="group" aria-label={action.kind === 'combine' ? `Сколько ${getPlaceName(place)} получилось?` : 'Сколько осталось?'}>
        {options.map((value) => (
          <button className="model-choice-button" data-testid={value === answer ? 'model-correct-choice' : undefined} type="button" key={value} onClick={value === answer ? onAdvance : onWrong}>
            {value}
          </button>
        ))}
      </div>
    )
  }

  const options = getExchangeChoices(action)
  const answer = getActionLabel(action)
  return (
    <div className="model-choice-list model-choice-list-text" role="group" aria-label="Выбери подходящий размен">
      {options.map((value) => (
        <button className="model-choice-button model-choice-button-text" data-testid={value === answer ? 'model-correct-choice' : undefined} type="button" key={value} onClick={value === answer ? onAdvance : onWrong}>
          {value}
        </button>
      ))}
    </div>
  )
}

export function PlaceValueExplorer({ a, b, operation, onComplete }: PlaceValueExplorerProps) {
  const actions = useMemo(() => buildPlaceValueActions(a, b, operation), [a, b, operation])
  const [actionIndex, setActionIndex] = useState(0)
  const [feedbackTone, setFeedbackTone] = useState<'neutral' | 'correct' | 'retry' | 'hint'>('neutral')
  const [message, setMessage] = useState('Выбери подходящий ответ ниже.')
  const action = actions[actionIndex]
  const counts = getCurrentCounts(a, b, operation, actions, actionIndex)
  const places = Array.from({ length: Math.max(String(a).length, String(b).length) }, (_, index) => Math.max(String(a).length, String(b).length) - index - 1)
  const isComplete = actionIndex >= actions.length

  const advance = () => {
    const isLastAction = actionIndex >= actions.length - 1
    setFeedbackTone('correct')
    setMessage(isLastAction ? 'Верно! Модель готова. Теперь запишем пример столбиком.' : 'Верно! Переходим к следующему шагу.')
    setActionIndex((index) => index + 1)
  }

  const handleWrongChoice = () => {
    if (!action) return
    setFeedbackTone('retry')
    setMessage(getWrongAnswerMessage(action))
  }

  const showHint = () => {
    setFeedbackTone('hint')
    setMessage(getActionHint(action))
  }

  return (
    <section className="place-explorer-card" aria-labelledby="model-title">
      <div className="place-explorer-heading">
        <p className="eyebrow">УЧИМСЯ НА ПРИМЕРЕ</p>
        <h1 id="model-title">{operation === 'add' ? 'Складываем по разрядам' : 'Вычитаем по разрядам'}</h1>
        <div className="model-symbol-guide" role="group" aria-label="Значение фишек">
          <span className="model-symbol-key"><b aria-hidden="true">•</b><span>1 точка — 1 единица</span></span>
          <span className="model-symbol-key"><b aria-hidden="true">△</b><span>1 треугольник — 1 десяток (10 точек)</span></span>
          <span className="model-symbol-key"><b aria-hidden="true">10 △</b><span>10 десятков — 1 сотня</span></span>
        </div>
        <p className="model-instruction">Считай справа налево. Прочитай задание над фишками и выбери ответ или размен внизу.</p>
      </div>

      <div className="place-operands" role="group" aria-label="Модели чисел">
        <div className="place-operand-card">
          <strong>Первое число: {a}</strong>
          <div className="place-token-row">
            {places.map((place) => <span className={`place-token place-token-${place}`} key={`a-${place}`}><b aria-hidden="true">{PLACE_SYMBOLS[place] ?? '◆'}</b><span>{PLACE_LABELS[place] ?? 'разряд'}: {describeTokens(a, place)}</span></span>)}
          </div>
        </div>
        <div className="place-operation-mark" role="img" aria-label={operation === 'add' ? 'плюс' : 'минус'} data-testid="model-operation">{operation === 'add' ? '+' : '−'}</div>
        <div className="place-operand-card">
          <strong>Второе число: {b}</strong>
          <div className="place-token-row">
            {places.map((place) => <span className={`place-token place-token-${place}`} key={`b-${place}`}><b aria-hidden="true">{PLACE_SYMBOLS[place] ?? '◆'}</b><span>{PLACE_LABELS[place] ?? 'разряд'}: {describeTokens(b, place)}</span></span>)}
          </div>
        </div>
      </div>

      <div className="model-current-card">
        <div className="model-current-heading">
          <span className="model-step-badge">{isComplete ? 'МОДЕЛЬ ГОТОВА' : `ШАГ ${actionIndex + 1} ИЗ ${actions.length}`}</span>
          <strong aria-live="polite">{isComplete ? 'Готово! Теперь запишем пример столбиком.' : action ? getActionPrompt(action) : ''}</strong>
        </div>
        <div className="model-current-places">
          {places.slice().reverse().map((place) => (
            <div className={`model-current-place${isActionPlace(action, place) ? ' model-current-place-active' : ''}`} key={place}>
              <span>{PLACE_LABELS[place] ?? 'разряд'}</span>
              <strong>{describeCurrentModel(counts[place] ?? 0, place)}</strong>
            </div>
          ))}
        </div>
        {!isComplete && action && renderAction(action, advance, handleWrongChoice)}
        {isComplete && <p className="model-finish-note">Нажми кнопку ниже, чтобы записать пример столбиком.</p>}
        <p className={`model-feedback model-feedback-${feedbackTone}`} role="status" aria-live="polite" aria-atomic="true">
          <span className="model-feedback-icon" aria-hidden="true">{feedbackTone === 'correct' ? '✓' : feedbackTone === 'retry' ? '↻' : feedbackTone === 'hint' ? '💡' : '•'}</span>
          <span>{message}</span>
        </p>
      </div>

      {isComplete && <button className="primary-button model-finish-button" type="button" onClick={onComplete}>Перейти к записи в столбик <span aria-hidden="true">→</span></button>}
      {!isComplete && <button className="text-button model-hint-button" type="button" onClick={showHint}>Нужна подсказка?</button>}
    </section>
  )
}
