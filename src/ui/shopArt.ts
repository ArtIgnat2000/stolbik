export interface ArtSlot {
  x: number
  y: number
  w: number
  ratio: number
  rotate?: number
  mirror?: boolean
  file?: string
}

/** Одна вещь = один слот либо пара половинок (левая нога, правая нога). */
export type ArtPlacement = ArtSlot | readonly [ArtSlot, ArtSlot]

export const ITEM_ART_IDS: ReadonlySet<string> = new Set([
  'cap', 'bow', 'glasses', 'scarf', 'medal',
  'shoes-first-step', 'shoes-cozy', 'shoes-breeze', 'shoes-autumn', 'shoes-snowflake', 'shoes-fins', 'shoes-neon'
])

/** Вещи, которые оборачивают шею: ложатся под голову (верх спрятан за ней). */
export const NECK_ART_IDS: ReadonlySet<string> = new Set(['scarf', 'medal'])

export function artHref(id: string): string {
  const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
  const root = base.endsWith('/') ? base : `${base}/`
  return `${root}shop/items/${id}.webp`
}

/**
 * Слот «носок вниз»: арт (боковой вид пары или одной туфельки) поворачивается
 * на -90° — носки смотрят вниз, как ступни БУКа. mirror — зеркало для левой ноги.
 * visX/visY/visW — итоговая рамка после поворота; fileRatio = h/w файла.
 */
function toeDown(visX: number, visY: number, visW: number, fileRatio: number, extra?: { mirror?: boolean; file?: string }): ArtSlot {
  const boxW = visW / fileRatio
  return {
    x: visX + (visW - boxW) / 2,
    y: visY + (boxW - visW) / 2,
    w: boxW,
    ratio: fileRatio,
    rotate: -90,
    ...extra
  }
}

/** Пара половинок: левая нога (зеркально) и правая. */
function shoePair(fileRatioL: number, fileRatioR: number, cx: number, visW: number, bottom: number): ArtPlacement {
  return [
    toeDown(cx - visW - 1, bottom - visW / fileRatioL, visW, fileRatioL, { mirror: true, file: '-l' }),
    toeDown(cx + 1, bottom - visW / fileRatioR, visW, fileRatioR, { file: '-r' })
  ]
}

/* Портрет «БУК» (viewBox 128×128) — голова-комочек. */
export const BLOB_ART_SLOTS: Readonly<Record<string, ArtPlacement>> = {
  'cap': { x: 38, y: -3, w: 52, ratio: 0.852, rotate: -8 },
  'bow': { x: 86, y: 14, w: 32, ratio: 0.983, rotate: 10 },
  'glasses': { x: 30, y: 57, w: 62, ratio: 0.356 },
  'scarf': { x: 51, y: 100, w: 26, ratio: 1.067 },
  'medal': { x: 55, y: 93, w: 16, ratio: 2.162 },
  'shoes-first-step': shoePair(0.535, 0.543, 64, 12, 127),
  'shoes-cozy': shoePair(0.482, 0.479, 64, 11, 127),
  'shoes-breeze': shoePair(0.516, 0.532, 64, 12, 127),
  'shoes-neon': shoePair(0.545, 0.556, 64, 12, 127),
  'shoes-autumn': shoePair(0.840, 0.866, 64, 15, 127),
  'shoes-snowflake': shoePair(0.919, 1.010, 64, 15, 127),
  'shoes-fins': shoePair(0.675, 0.688, 64, 14, 127)
}

/* Полный рост «Примерочная» (viewBox 200×300). */
export const FULL_ART_SLOTS: Readonly<Record<string, ArtPlacement>> = {
  'cap': { x: 61, y: -2, w: 78, ratio: 0.852, rotate: -8 },
  'bow': { x: 130, y: 18, w: 52, ratio: 0.983, rotate: 10 },
  'glasses': { x: 52, y: 57, w: 96, ratio: 0.356 },
  'scarf': { x: 66, y: 112, w: 68, ratio: 1.067 },
  'medal': { x: 80, y: 115, w: 39, ratio: 2.162 },
  'shoes-first-step': shoePair(0.535, 0.543, 100, 42, 292),
  'shoes-cozy': shoePair(0.482, 0.479, 100, 42, 292),
  'shoes-breeze': shoePair(0.516, 0.532, 100, 42, 292),
  'shoes-neon': shoePair(0.545, 0.556, 100, 42, 292),
  'shoes-autumn': shoePair(0.840, 0.866, 100, 48, 292),
  'shoes-snowflake': shoePair(0.919, 1.010, 100, 48, 292),
  'shoes-fins': shoePair(0.675, 0.688, 100, 44, 292)
}

export function artTransform(slot: ArtSlot): string | undefined {
  const cx = slot.x + slot.w / 2
  const cy = slot.y + (slot.w * slot.ratio) / 2
  if (slot.mirror && slot.rotate) return `translate(${2 * cx} 0) scale(-1 1) rotate(${slot.rotate} ${cx} ${cy})`
  if (slot.mirror) return `translate(${2 * cx} 0) scale(-1 1)`
  if (slot.rotate) return `rotate(${slot.rotate} ${cx} ${cy})`
  return undefined
}
