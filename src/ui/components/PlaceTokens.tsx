import { tokenCount } from '../placeNames'

export type TokenTone = 'first' | 'second' | 'answer' | 'carry' | 'muted'
export type TokenSize = 'sm' | 'md' | 'lg'

export interface PlaceTokensProps {
  /** 0 — точки, 1 — треугольники, 2 — квадраты, 3 — тысячи. */
  place: number
  count: number
  tone?: TokenTone
  size?: TokenSize
  /** Зачёркивание: фишки, которые убирают при вычитании. */
  crossed?: boolean
  /** Текстовая расшифровка для скринридера; без неё фишки декоративные. */
  label?: string
  className?: string
}

/** Десять точек внутри треугольника — ряды 1, 2, 3, 4. */
const TRIANGLE_PIPS: ReadonlyArray<readonly [number, number]> = Object.freeze([
  [60, 26],
  [48, 44], [72, 44],
  [36, 62], [60, 62], [84, 62],
  [24, 80], [48, 80], [72, 80], [96, 80]
])

/** Фишки внутри квадрата: два ряда по пять (треугольники или квадраты). */
const INNER_CELLS: ReadonlyArray<readonly [number, number, number, number]> = Object.freeze(
  Array.from({ length: 10 }, (_, index) => {
    const column = index % 5
    const row = Math.floor(index / 5)
    return [12 + column * 19.2, 12 + row * 50, 19.2, 40] as const
  })
)

function TokenShape({ place, size, crossed }: { place: number; size: TokenSize; crossed: boolean }) {
  const classes = ['place-token', `place-token-${size}`, crossed ? 'place-token-crossed' : '']
    .filter(Boolean)
    .join(' ')

  if (place <= 0) {
    return <span className={`${classes} place-token-dot`} />
  }

  if (place === 1) {
    return (
      <svg className={`${classes} place-token-triangle`} viewBox="0 0 120 110" aria-hidden="true" focusable="false">
        <polygon className="place-token-body" points="60,7 7,100 113,100" />
        {TRIANGLE_PIPS.map(([cx, cy], index) => (
          <circle className="place-token-pip" cx={cx} cy={cy} r="5" key={index} />
        ))}
      </svg>
    )
  }

  if (place === 2) {
    return (
      <svg className={`${classes} place-token-square`} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <rect className="place-token-body" x="4" y="4" width="112" height="112" rx="12" />
        {INNER_CELLS.map(([x, y, width, height], index) => (
          <polygon
            className="place-token-pip"
            points={`${x + width / 2},${y} ${x},${y + height} ${x + width},${y + height}`}
            key={index}
          />
        ))}
      </svg>
    )
  }

  return (
    <svg className={`${classes} place-token-square`} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <rect className="place-token-body" x="4" y="4" width="112" height="112" rx="12" />
      {INNER_CELLS.map(([x, y, width, height], index) => (
        <rect className="place-token-pip" x={x} y={y} width={width} height={height} rx="3" key={index} />
      ))}
    </svg>
  )
}

/**
 * Фишки одного разряда: точки для единиц, треугольники для десятков, квадраты для сотен.
 * Ребёнок видит, из чего состоит цифра, и понимает, почему десять единиц — это десяток.
 */
export function PlaceTokens({
  place,
  count,
  tone = 'first',
  size = 'sm',
  crossed = false,
  label,
  className = ''
}: PlaceTokensProps) {
  if (count <= 0) return null

  const classes = [
    'place-tokens',
    `place-tokens-${size}`,
    place <= 0 ? 'place-tokens-dots' : '',
    `place-tone-${tone}`,
    crossed ? 'place-tokens-crossed' : '',
    className
  ]
    .filter(Boolean)
    .join(' ')

  const tokens = Array.from({ length: count }, (_, index) => (
    <TokenShape place={place} size={size} crossed={crossed} key={index} />
  ))

  if (label) {
    return (
      <span className={classes} role="img" aria-label={label}>
        {tokens}
      </span>
    )
  }

  return <span className={classes} aria-hidden="true">{tokens}</span>
}

/** «3 точки» — счётная подпись для фишек разряда. */
export function placeTokensLabel(place: number, count: number): string {
  return tokenCount(place, count)
}
