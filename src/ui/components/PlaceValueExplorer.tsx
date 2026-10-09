import { useMemo, useState } from 'react'
import { buildPlaceValueActions, getPlaceName, type PlaceValueAction } from '../../engine/placeValue'
import type { Operation } from '../../engine/column'
import { ExchangeDiagram, PlaceValueChips, type ChipGroup } from './placeValueMarks'

interface PlaceValueExplorerProps {
  a: number
  b: number
  operation: Operation
  onComplete: () => void
}

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

/** Столбец модели: разряд, картинка фишек, подпись и пометка текущего действия. */
interface ModelColumn {
  place: number
  groups: ChipGroup[]
  caption: string
  flag: string | null
}

function buildAddColumns(a: number, b: number, actions: readonly PlaceValueAction[], actionIndex: number, places: readonly number[]): ModelColumn[] {
  const action = actions[actionIndex]
  const previous = actions[actionIndex - 1]
  const top = Math.max(...places)
  const totals = Array.from({ length: top + 1 }, (_, place) => digitAt(a, place) + digitAt(b, place))
  const combined = new Set(actions.slice(0, actionIndex).filter((item) => item.kind === 'combine').map((item) => item.place))
  for (const item of actions.slice(0, actionIndex)) {
    if (item.kind === 'regroup') {
      totals[item.fromPlace] = (totals[item.fromPlace] ?? 0) - 10 * item.groupsOfTen
      totals[item.toPlace] = (totals[item.toPlace] ?? 0) + item.groupsOfTen
    }
  }

  return places.map((place) => {
    const aDigit = digitAt(a, place)
    const bDigit = digitAt(b, place)
    const total = totals[place] ?? 0
    let groups: ChipGroup[] = []
    let caption = ''
    let flag: string | null = null

    if (action?.kind === 'combine' && action.place === place) {
      if (action.aDigit === 0 && action.bDigit === 0) {
        groups = [{ count: action.carryIn, tone: 'carry', label: 'перенос' }]
        caption = countLabel(action.carryIn, place)
      } else {
        groups = [
          ...(action.aDigit > 0 ? [{ count: action.aDigit, tone: 'first' as const, label: `из ${a}` }] : []),
          ...(action.bDigit > 0 ? [{ count: action.bDigit, tone: 'second' as const, label: `из ${b}` }] : []),
          ...(action.carryIn > 0 ? [{ count: action.carryIn, tone: 'carry' as const, label: 'перенос' }] : [])
        ]
        caption = [
          countLabel(action.aDigit, place),
          countLabel(action.bDigit, place),
          ...(action.carryIn > 0 ? [countLabel(action.carryIn, place)] : [])
        ].join(' + ')
      }
      flag = 'сложи'
    } else if (action?.kind === 'regroup' && action.fromPlace === place) {
      groups = [{ count: action.unitsLeft }, { count: action.groupsOfTen * 10, tone: 'source', label: 'меняем' }]
      caption = describeCurrentModel(total, place)
      flag = 'размен'
    } else if (combined.has(place) || (aDigit === 0 && bDigit === 0)) {
      groups = [{ count: total }]
      caption = describeCurrentModel(total, place)
    } else {
      groups = [
        { count: aDigit, tone: 'first', label: `из ${a}` },
        { count: bDigit, tone: 'second', label: `из ${b}` }
      ]
      caption = `${countLabel(aDigit, place)} + ${countLabel(bDigit, place)}`
    }

    if (previous?.kind === 'regroup' && previous.toPlace === place && !(action && isActionPlace(action, place))) {
      groups = [{ count: Math.max(0, total - previous.groupsOfTen) }, { count: previous.groupsOfTen, tone: 'carry', label: 'новый' }]
      caption = describeCurrentModel(total, place)
    }

    return { place, groups, caption, flag }
  })
}

function buildSubtractColumns(a: number, b: number, actions: readonly PlaceValueAction[], actionIndex: number, places: readonly number[]): ModelColumn[] {
  const action = actions[actionIndex]
  const counts = getCurrentCounts(a, b, 'subtract', actions, actionIndex)

  return places.map((place) => {
    const count = counts[place] ?? 0
    let groups: ChipGroup[] = [{ count }]
    let flag: string | null = null

    if (action?.kind === 'remove' && action.place === place) {
      groups = [{ count: action.remaining }, { count: action.amount, tone: 'removing', crossed: true }]
      flag = `− ${amountLabel(action.amount, action.place)}`
    } else if (action?.kind === 'exchange' && action.fromPlace === place) {
      groups = [{ count: Math.max(0, count - 1) }, { count: 1, tone: 'source', label: 'меняем' }]
      flag = 'размен'
    } else if (action?.kind === 'exchange' && action.toPlace === place) {
      flag = 'сюда'
    }

    return { place, groups, caption: describeCurrentModel(count, place), flag }
  })
}

function buildResultColumns(result: number, places: readonly number[]): ModelColumn[] {
  return places.map((place) => ({
    place,
    groups: [{ count: digitAt(result, place) }],
    caption: describeCurrentModel(digitAt(result, place), place),
    flag: null
  }))
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
    return `Ответ не совпал. Размен должен сохранять число. Подумай, какую фишку меняют на 10 ${getPlaceName(action.toPlace)}, и выбери обмен ещё раз.`
  }
  return `Ответ не совпал. Из ${genitiveLabel(action.available, action.place)} убери ${amountLabel(action.amount, action.place)} и пересчитай остаток. Попробуй ещё раз.`
}

function isActionPlace(action: PlaceValueAction | undefined, place: number): boolean {
  if (!action) return false
  if (action.kind === 'combine' || action.kind === 'remove') return action.place === place
  return action.fromPlace === place || action.toPlace === place
}

/** Размен, который показывает картинка: 1 фишка старшего разряда = 10 младших. */
function getExchangeDiagram(action: Extract<PlaceValueAction, { kind: 'regroup' | 'exchange' }>) {
  if (action.kind === 'regroup') {
    return {
      fromPlace: action.fromPlace,
      toPlace: action.toPlace,
      fromCount: action.groupsOfTen * 10,
      toCount: action.groupsOfTen,
      fromLabel: countLabel(action.groupsOfTen * 10, action.fromPlace),
      toLabel: countLabel(action.groupsOfTen, action.toPlace),
      fromSize: 'sm' as const,
      toSize: 'xl' as const
    }
  }
  return {
    fromPlace: action.fromPlace,
    toPlace: action.toPlace,
    fromCount: 1,
    toCount: 10,
    fromLabel: countLabel(1, action.fromPlace),
    toLabel: countLabel(10, action.toPlace),
    fromSize: 'xl' as const,
    toSize: 'sm' as const
  }
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
  const result = operation === 'add' ? a + b : a - b
  const places = useMemo(() => {
    const length = Math.max(String(a).length, String(b).length)
    const highest = actions.reduce((max, item) => Math.max(max, 'place' in item ? item.place : item.toPlace), -1)
    const count = Math.max(length, highest + 1)
    return Array.from({ length: count }, (_, index) => count - index - 1)
  }, [a, b, actions])
  const columns = useMemo(() => (
    operation === 'add'
      ? buildAddColumns(a, b, actions, actionIndex, places)
      : buildSubtractColumns(a, b, actions, actionIndex, places)
  ), [a, b, actions, actionIndex, operation, places])
  const resultColumns = useMemo(() => buildResultColumns(result, places), [result, places])
  const isComplete = actionIndex >= actions.length
  const exchange = action && (action.kind === 'regroup' || action.kind === 'exchange') ? getExchangeDiagram(action) : null

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

  const renderColumn = (column: ModelColumn, keyPrefix: string, interactive: boolean) => (
    <div
      className={`model-board-column${interactive && isActionPlace(action, column.place) ? ' model-board-column-active' : ''}`}
      key={`${keyPrefix}-${column.place}`}
    >
      <div className="model-board-column-head">
        <span className="model-board-place">{PLACE_LABELS[column.place] ?? 'разряд'}</span>
        {interactive && column.flag && <span className="model-board-flag">{column.flag}</span>}
      </div>
      <PlaceValueChips place={column.place} groups={column.groups} size="md" />
      <strong className="model-board-caption">{column.caption}</strong>
    </div>
  )

  return (
    <section className="place-explorer-card" aria-labelledby="model-title">
      <div className="place-explorer-heading">
        <p className="eyebrow">УЧИМСЯ НА ПРИМЕРЕ</p>
        <h1 id="model-title">{operation === 'add' ? 'Складываем по разрядам' : 'Вычитаем по разрядам'}</h1>
        <div className="model-symbol-guide" role="group" aria-label="Значение фишек">
          <span className="model-symbol-key">
            <PlaceValueChips place={0} groups={[{ count: 1 }]} size="xl" />
            <span>1 точка — 1 единица</span>
          </span>
          <span className="model-symbol-key">
            <PlaceValueChips place={1} groups={[{ count: 1 }]} size="xl" />
            <span>1 треугольник — 1 десяток (10 точек)</span>
          </span>
          <span className="model-symbol-key">
            <PlaceValueChips place={2} groups={[{ count: 1 }]} size="xl" />
            <span>10 десятков — 1 сотня</span>
          </span>
        </div>
        <p className="model-instruction">Считай справа налево. Прочитай задание над фишками и выбери ответ или размен внизу.</p>
      </div>

      <div className="place-operands" role="group" aria-label="Модели чисел">
        <div className="place-operand-card">
          <strong>Первое число: {a}</strong>
          <div className="place-operand-places">
            {places.map((place) => (
              <div className={`place-operand-place place-token-${place}`} key={`a-${place}`}>
                <span className="place-operand-place-name">{PLACE_LABELS[place] ?? 'разряд'}</span>
                <PlaceValueChips place={place} groups={[{ count: digitAt(a, place) }]} size="sm" />
                <span className="visually-hidden">{describeTokens(a, place)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="place-operation-mark" role="img" aria-label={operation === 'add' ? 'плюс' : 'минус'} data-testid="model-operation">{operation === 'add' ? '+' : '−'}</div>
        <div className="place-operand-card">
          <strong>Второе число: {b}</strong>
          <div className="place-operand-places">
            {places.map((place) => (
              <div className={`place-operand-place place-token-${place}`} key={`b-${place}`}>
                <span className="place-operand-place-name">{PLACE_LABELS[place] ?? 'разряд'}</span>
                <PlaceValueChips place={place} groups={[{ count: digitAt(b, place) }]} size="sm" />
                <span className="visually-hidden">{describeTokens(b, place)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="model-current-card">
        <div className="model-current-heading">
          <span className="model-step-badge">{isComplete ? 'МОДЕЛЬ ГОТОВА' : `ШАГ ${actionIndex + 1} ИЗ ${actions.length}`}</span>
          <strong aria-live="polite">{isComplete ? 'Готово! Теперь запишем пример столбиком.' : action ? getActionPrompt(action) : ''}</strong>
        </div>

        {exchange && (
          <div className="model-exchange-card">
            <p className="eyebrow">РАЗМЕН</p>
            <ExchangeDiagram {...exchange} />
          </div>
        )}

        <div className="model-board" role="group" aria-label="Модель примера по разрядам">
          {columns.map((column) => renderColumn(column, 'model', !isComplete))}
        </div>

        {isComplete && (
          <div className="model-result-card">
            <p className="eyebrow">ПОЛУЧИЛОСЬ</p>
            <strong className="model-result-title">{a} {operation === 'add' ? '+' : '−'} {b} = {result}</strong>
            <div className="model-board model-board-result">
              {resultColumns.map((column) => renderColumn(column, 'result', false))}
            </div>
          </div>
        )}

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
