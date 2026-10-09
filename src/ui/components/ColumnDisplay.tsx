import type { CSSProperties } from 'react'
import type { ColumnAnalysis, ColumnStep } from '../../engine/column'

interface ColumnDisplayProps {
  analysis: ColumnAnalysis
  answers?: Readonly<Record<number, number>>
  activePlace?: number | null
  visibleSteps?: readonly ColumnStep[]
  demo?: boolean
}

const PLACE_SHORT_NAMES: Readonly<Record<number, string>> = Object.freeze({
  0: 'ед.',
  1: 'дес.',
  2: 'сот.',
  3: 'тыс.'
})

export function ColumnDisplay({
  analysis,
  answers = {},
  activePlace = null,
  visibleSteps = [],
  demo = false
}: ColumnDisplayProps) {
  const places = Array.from({ length: analysis.columnCount }, (_, index) => analysis.columnCount - index - 1)
  const annotations = new Map<number, number>()
  const borrowedPlaces = new Set<number>()
  for (const step of visibleSteps) {
    if (analysis.operation === 'add' && step.carryOut > 0) {
      annotations.set(step.place + 1, step.carryOut)
    }
    if (analysis.operation === 'subtract' && step.borrow) {
      for (const change of step.borrow.changes) {
        annotations.set(change.place, change.after)
        borrowedPlaces.add(change.place)
      }
    }
  }
  const gridStyle = { '--column-count': analysis.columnCount } as CSSProperties
  const sign = analysis.operation === 'add' ? '+' : '−'

  return (
    <figure
      className={`column-display${demo ? ' column-display-demo' : ''}`}
      style={gridStyle}
      aria-label={`Столбик: ${analysis.a} ${analysis.operation === 'add' ? 'плюс' : 'минус'} ${analysis.b}`}
      data-testid="column-display"
    >
      <span className="visually-hidden" data-testid="operand-a">{analysis.a}</span>
      <span className="visually-hidden" data-testid="operand-b">{analysis.b}</span>
      <span className="visually-hidden" data-testid="operation">{analysis.operation}</span>
      <div className="column-grid" role="group">
        <div className="column-sign column-sign-empty" aria-hidden="true" />
        {places.map((place) => (
          <div className="place-label" key={`label-${place}`} aria-hidden="true">
            {PLACE_SHORT_NAMES[place] ?? 'разр.'}
          </div>
        ))}

        <div className="column-sign column-sign-empty" aria-hidden="true" />
        {places.map((place) => {
          const annotation = annotations.get(place)
          return (
            <div className="column-cell annotation-cell" key={`annotation-${place}`} aria-label={annotation === undefined ? undefined : `Изменённая цифра ${annotation}`}>
              {annotation !== undefined && <span className={`annotation-value${analysis.operation === 'subtract' ? ' annotation-borrow' : ' annotation-carry'}`}>{annotation}</span>}
            </div>
          )
        })}

        <div className="column-sign column-sign-empty" aria-hidden="true" />
        {places.map((place) => {
          const digit = Math.floor(analysis.a / 10 ** place) % 10
          const present = place < String(analysis.a).length
          const crossed = analysis.operation === 'subtract' && borrowedPlaces.has(place) && annotations.has(place)
          return (
            <div className={`column-cell number-cell${crossed ? ' number-cell-borrowed' : ''}`} key={`a-${place}`}>
              <span className={crossed ? 'large-digit digit-crossed' : 'large-digit'}>{present ? digit : ''}</span>
            </div>
          )
        })}

        <div className="column-sign operation-sign" aria-label={analysis.operation === 'add' ? 'плюс' : 'минус'}>{sign}</div>
        {places.map((place) => {
          const present = place < String(analysis.b).length
          const digit = Math.floor(analysis.b / 10 ** place) % 10
          return <div className="column-cell number-cell operation-number" key={`b-${place}`}>{present ? digit : ''}</div>
        })}

        <div className="column-sign answer-sign" aria-hidden="true">=</div>
        {places.map((place) => {
          const isActive = activePlace === place
          const value = answers[place]
          return (
            <div
              className={`column-cell answer-cell${isActive ? ' answer-cell-active' : ''}${value !== undefined ? ' answer-cell-filled' : ''}`}
              key={`answer-${place}`}
              aria-label={value !== undefined ? `Ответ в разряде ${PLACE_SHORT_NAMES[place] ?? 'числа'}: ${value}` : isActive ? `Сейчас впиши цифру в разряд ${PLACE_SHORT_NAMES[place] ?? 'числа'}` : `Пустой разряд ${PLACE_SHORT_NAMES[place] ?? 'числа'}`}
              aria-current={isActive ? 'step' : undefined}
            >
              {value !== undefined ? value : isActive ? <span className="active-dot" aria-hidden="true" /> : ''}
            </div>
          )
        })}
      </div>
      <figcaption className="visually-hidden">Сначала решаем единицы, затем десятки и сотни.</figcaption>
    </figure>
  )
}
