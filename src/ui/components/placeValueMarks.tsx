import { Fragment, type ReactNode } from 'react'

/**
 * Наглядная модель разрядов: точка — единица, треугольник — десяток
 * (внутри десять точек), сотня — десять треугольников, тысяча — десять сотен.
 * Фишки рисуются один раз в SVG, поэтому картинка видна и на печати, и офлайн.
 */

/** Положения десяти точек внутри треугольника-десятка: ряды 1, 2, 3 и 4. */
export const TEN_DOT_POSITIONS = [
  [60, 24],
  [48, 44], [72, 44],
  [36, 64], [60, 64], [84, 64],
  [26, 84], [49, 84], [71, 84], [94, 84]
] as const

export type ChipTone = 'first' | 'second' | 'carry' | 'source' | 'removing'

export interface ChipGroup {
  count: number
  tone?: ChipTone
  /** Фишки, которые убираем: перечёркнуты и бледные. */
  crossed?: boolean
  /** Короткая подпись над группой, например «из 36» или «перенос». */
  label?: string
}

export type MarkSize = 'sm' | 'md' | 'lg' | 'xl'

function DotMark() {
  return (
    <svg className="pv-mark pv-mark-dot" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}

function TriangleMark() {
  return (
    <svg className="pv-mark pv-mark-triangle" viewBox="0 0 120 110" aria-hidden="true" focusable="false">
      <polygon className="pv-mark-plate" points="60,5 8,104 112,104" />
      {TEN_DOT_POSITIONS.map(([cx, cy], index) => (
        <circle className="pv-mark-dot-inner" cx={cx} cy={cy} r="7" key={index} />
      ))}
    </svg>
  )
}

/** Десять треугольников внутри пластины: одна сотня. */
const HUNDRED_TRIANGLES = [6, 32].flatMap((top) => [14, 38, 62, 86, 110].map((cx) => [cx, top] as const))

function HundredMark() {
  return (
    <svg className="pv-mark pv-mark-hundred" viewBox="0 0 120 62" aria-hidden="true" focusable="false">
      <rect className="pv-mark-plate" x="2.5" y="2.5" width="115" height="57" rx="9" />
      {HUNDRED_TRIANGLES.map(([cx, top], index) => (
        <polygon className="pv-mark-dot-inner" points={`${cx},${top} ${cx - 8},${top + 16} ${cx + 8},${top + 16}`} key={index} />
      ))}
    </svg>
  )
}

/** Десять сотен внутри большой пластины: одна тысяча. */
const THOUSAND_SQUARES = [8, 34].flatMap((top) => [10, 32, 54, 76, 98].map((left) => [left, top] as const))

function ThousandMark() {
  return (
    <svg className="pv-mark pv-mark-thousand" viewBox="0 0 120 62" aria-hidden="true" focusable="false">
      <rect className="pv-mark-plate" x="2.5" y="2.5" width="115" height="57" rx="9" />
      {THOUSAND_SQUARES.map(([left, top], index) => (
        <rect className="pv-mark-dot-inner" x={left} y={top} width="18" height="18" rx="3" key={index} />
      ))}
    </svg>
  )
}

const PLACE_MARKS: readonly (() => ReactNode)[] = [DotMark, TriangleMark, HundredMark, ThousandMark]

/** Фишка нужного разряда: точка, треугольник, сотня или тысяча. */
export function PlaceMark({ place }: { place: number }) {
  const Mark = PLACE_MARKS[place] ?? DotMark
  return <Mark />
}

interface PlaceValueChipsProps {
  place: number
  groups: readonly ChipGroup[]
  size?: MarkSize
  emptyText?: string
}

/** Ряд фишек одного разряда. Группы разделяются «+» или чертой. */
export function PlaceValueChips({ place, groups, size = 'md', emptyText = 'пусто' }: PlaceValueChipsProps) {
  const Mark = PLACE_MARKS[place] ?? DotMark
  const visible = groups.filter((group) => group.count > 0)
  return (
    <div className={`pv-chips pv-chips-${size} pv-chips-place-${place}`} aria-hidden="true">
      {visible.length === 0 && <span className="pv-chips-empty">{emptyText}</span>}
      {visible.map((group, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <span className={`pv-chip-separator pv-chip-separator-${group.crossed ? 'removing' : 'plus'}`} aria-hidden="true">
              {group.crossed ? '' : '+'}
            </span>
          )}
          <span className={`pv-chip-group pv-chip-group-${group.tone ?? 'plain'}`}>
            {group.label && <span className="pv-chip-group-label">{group.label}</span>}
            <span className="pv-chip-row">
              {Array.from({ length: group.count }, (_, chipIndex) => (
                <span className={`pv-chip${group.crossed ? ' pv-chip-crossed' : ''}`} key={chipIndex}>
                  <Mark />
                  {group.crossed && (
                    <svg className="pv-cross" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M4.5 4.5 L19.5 19.5 M19.5 4.5 L4.5 19.5" />
                    </svg>
                  )}
                </span>
              ))}
            </span>
          </span>
        </Fragment>
      ))}
    </div>
  )
}

interface ExchangeDiagramProps {
  fromPlace: number
  toPlace: number
  fromCount: number
  toCount: number
  fromLabel: string
  toLabel: string
  fromSize?: MarkSize
  toSize?: MarkSize
}

/** Картинка размена: одна фишка старшего разряда равна десяти младшим. */
export function ExchangeDiagram({
  fromPlace,
  toPlace,
  fromCount,
  toCount,
  fromLabel,
  toLabel,
  fromSize = 'lg',
  toSize = 'sm'
}: ExchangeDiagramProps) {
  return (
    <div className="pv-exchange" role="group" aria-label={`${fromLabel} — это ${toLabel}`}>
      <span className="pv-exchange-side">
        <PlaceValueChips place={fromPlace} groups={[{ count: fromCount }]} size={fromSize} />
        <span className="pv-exchange-label">{fromLabel}</span>
      </span>
      <span className="pv-exchange-equals" aria-hidden="true">=</span>
      <span className="pv-exchange-side">
        <PlaceValueChips place={toPlace} groups={[{ count: toCount }]} size={toSize} />
        <span className="pv-exchange-label">{toLabel}</span>
      </span>
    </div>
  )
}
