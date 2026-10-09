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
  { one: 'единицу', few: 'единицы', many: 'единиц', countOne: 'единица' },
  { one: 'десяток', few: 'десятка', many: 'десятков', countOne: 'десяток' },
  { one: 'сотню', few: 'сотни', many: 'сотен', countOne: 'сотня' },
  { one: 'тысячу', few: 'тысячи', many: 'тысяч', countOne: 'тысяча' }
] as const

function getFormIndex(amount: number): 0 | 1 | 2 {
  const lastTwo = amount % 100
  const last = amount % 10
  return lastTwo >= 11 && lastTwo <= 14 ? 2 : last === 1 ? 0 : last >= 2 && last <= 4 ? 1 : 2
}

function amountLabel(amount: number, place: number): string {
  const forms = PLACE_FORMS[place] ?? PLACE_FORMS[0]
  const formIndex = getFormIndex(amount)
  const word = formIndex === 0 ? forms.one : formIndex === 1 ? forms.few : forms.many
  return `${amount} ${word}`
}

function countLabel(amount: number, place: number): string {
  const forms = PLACE_FORMS[place] ?? PLACE_FORMS[0]
  const formIndex = getFormIndex(amount)
  const word = formIndex === 0 ? forms.countOne : formIndex === 1 ? forms.few : forms.many
  return `${amount} ${word}`
}

function digitAt(value: number, place: number): number {
  return Math.floor(value / 10 ** place) % 10
}

function describeTokens(value: number, place: number): string {
  const count = digitAt(value, place)
  if (place === 2) return `△ × ${count * 10}`
  if (place === 1) return `△ × ${count}`
  if (place === 0) return `• × ${count}`
  return `△ × ${count * 100}`
}

function describeCurrentModel(count: number, place: number): string {
  if (place === 2) return `${countLabel(count, place)} = △ × ${count * 10}`
  if (place === 1 && count === 10) return '10 △ = 1 сотня'
  if (place === 1) return `△ × ${countLabel(count, place)}`
  if (place === 0 && count === 10) return '10 • = 1 △'
  if (place === 0) return `• × ${countLabel(count, place)}`
  return `${count} единиц старшего разряда`
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
    return `Сколько ${getPlaceName(action.place)} получится, если объединить группы?`
  }
  if (action.kind === 'regroup') {
    return `Получилось ${action.groupsOfTen * 10 + action.unitsLeft} ${getPlaceName(action.fromPlace)}. Как представить их крупными разрядными группами?`
  }
  if (action.kind === 'exchange') {
    return `В разряде ${getPlaceName(action.toPlace)} сейчас ${action.targetBefore}. Как получить здесь 10 таких единиц, не меняя число?`
  }
  return `Сейчас есть ${countLabel(action.available, action.place)}. Уберём ${amountLabel(action.amount, action.place)}. Сколько останется?`
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
        `Объединить ${amountLabel(1, action.fromPlace)} в ${amountLabel(10, action.toPlace)}`,
        `Объединить ${amountLabel(10, action.fromPlace)} в ${amountLabel(10, action.toPlace)}`
      ]
    : [
        `Обменять ${amountLabel(10, action.fromPlace)} на ${amountLabel(1, action.toPlace)}`,
        `Обменять ${amountLabel(1, action.fromPlace)} на ${amountLabel(1, action.toPlace)}`
      ]
  return rotateOptions([correct, ...wrong], action.fromPlace + action.toPlace)
}

function getActionHint(action: PlaceValueAction | undefined): string {
  if (!action) return 'Посмотри на модель и подумай, что изменилось.'
  if (action.kind === 'combine') return 'Посчитай точки или треугольники по группам. Если уже был перенос, учти ещё одну группу.'
  if (action.kind === 'regroup') return `Вспомни: ${amountLabel(10, action.fromPlace)} можно объединить в ${amountLabel(1, action.toPlace)}.`
  if (action.kind === 'exchange') return `Размен идёт в обратную сторону: ${amountLabel(1, action.fromPlace)} можно представить как ${amountLabel(10, action.toPlace)}.`
  return 'Убери указанное число разрядных единиц и посчитай, сколько осталось.'
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
  const [message, setMessage] = useState('')
  const action = actions[actionIndex]
  const counts = getCurrentCounts(a, b, operation, actions, actionIndex)
  const places = Array.from({ length: Math.max(String(a).length, String(b).length) }, (_, index) => Math.max(String(a).length, String(b).length) - index - 1)
  const isComplete = actionIndex >= actions.length

  const advance = () => {
    setMessage('Верно. Посмотрим на следующий разряд.')
    setActionIndex((index) => index + 1)
  }

  const handleWrongChoice = () => {
    setMessage('Попробуй пересчитать точки и разрядные группы. Ошибки здесь ничего не отнимают.')
  }

  return (
    <section className="place-explorer-card" aria-labelledby="model-title">
      <div className="place-explorer-heading">
        <p className="eyebrow">ИССЛЕДУЕМ МОДЕЛЬ</p>
        <h1 id="model-title">Сначала числа — потом правило</h1>
        <p>В модели единицы показаны точками, десятки — треугольниками; одна сотня равна десяти десяткам. Попробуй сам увидеть, что происходит с разрядами.</p>
      </div>

      <div className="place-operands" role="group" aria-label="Модели чисел">
        <div className="place-operand-card">
          <strong>Первое число: {a}</strong>
          <div className="place-token-row">
            {places.map((place) => <span className={`place-token place-token-${place}`} key={`a-${place}`}><b aria-hidden="true">{PLACE_SYMBOLS[place] ?? '◆'}</b><span>{describeTokens(a, place)} · {PLACE_LABELS[place] ?? 'разряд'}</span></span>)}
          </div>
        </div>
        <div className="place-operation-mark" role="img" aria-label={operation === 'add' ? 'плюс' : 'минус'} data-testid="model-operation">{operation === 'add' ? '+' : '−'}</div>
        <div className="place-operand-card">
          <strong>Второе число: {b}</strong>
          <div className="place-token-row">
            {places.map((place) => <span className={`place-token place-token-${place}`} key={`b-${place}`}><b aria-hidden="true">{PLACE_SYMBOLS[place] ?? '◆'}</b><span>{describeTokens(b, place)} · {PLACE_LABELS[place] ?? 'разряд'}</span></span>)}
          </div>
        </div>
      </div>

      <div className="model-current-card">
        <div className="model-current-heading">
          <span className="model-step-badge">{isComplete ? 'МОДЕЛЬ ГОТОВА' : `ШАГ ${actionIndex + 1} ИЗ ${actions.length}`}</span>
          <strong aria-live="polite">{isComplete ? 'Что получилось в каждом разряде?' : action ? getActionPrompt(action) : ''}</strong>
        </div>
        <div className="model-current-places">
          {places.slice().reverse().map((place) => (
            <div className="model-current-place" key={place}>
              <span>{PLACE_LABELS[place] ?? 'разряд'}</span>
              <strong>{describeCurrentModel(counts[place] ?? 0, place)}</strong>
            </div>
          ))}
        </div>
        {!isComplete && action && renderAction(action, advance, handleWrongChoice)}
        {isComplete && <p className="model-finish-note">Ты построил модель действия. Теперь сопоставим её с записью в столбик.</p>}
        <p className="model-feedback" role="status" aria-live="polite">{message || 'Можно попросить подсказку — спешить не нужно.'}</p>
      </div>

      {isComplete && <button className="primary-button model-finish-button" type="button" onClick={onComplete}>Перейти к записи в столбик <span aria-hidden="true">→</span></button>}
      {!isComplete && <button className="text-button model-hint-button" type="button" onClick={() => setMessage(getActionHint(action))}>Нужна подсказка?</button>}
    </section>
  )
}
