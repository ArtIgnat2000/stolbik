export interface ArtSlot {
  x: number
  y: number
  w: number
  ratio: number
  rotate?: number
}

export const ITEM_ART_IDS: ReadonlySet<string> = new Set([
  'cap', 'bow', 'glasses', 'scarf', 'medal',
  'shoes-first-step', 'shoes-cozy', 'shoes-breeze', 'shoes-autumn', 'shoes-snowflake', 'shoes-fins', 'shoes-neon'
])

export function artHref(id: string): string {
  const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
  const root = base.endsWith('/') ? base : `${base}/`
  return `${root}shop/items/${id}.webp`
}

const BLOB_SHOE_SLOT: ArtSlot = { x: 44, y: 103, w: 40, ratio: 0.667 }
const BLOB_SHOE_SLOT_SQUARE: ArtSlot = { x: 48, y: 99, w: 32, ratio: 1 }

export const BLOB_ART_SLOTS: Readonly<Record<string, ArtSlot>> = {
  'cap': { x: 42, y: 0, w: 48, ratio: 1, rotate: -8 },
  'bow': { x: 84, y: 14, w: 34, ratio: 1, rotate: 10 },
  'glasses': { x: 32, y: 50, w: 64, ratio: 0.667 },
  'scarf': { x: 52, y: 102, w: 26, ratio: 1 },
  'medal': { x: 50, y: 100, w: 28, ratio: 1 },
  'shoes-first-step': BLOB_SHOE_SLOT,
  'shoes-cozy': BLOB_SHOE_SLOT,
  'shoes-breeze': BLOB_SHOE_SLOT,
  'shoes-fins': BLOB_SHOE_SLOT,
  'shoes-neon': BLOB_SHOE_SLOT,
  'shoes-autumn': { x: 45, y: 102, w: 38, ratio: 0.75 },
  'shoes-snowflake': BLOB_SHOE_SLOT_SQUARE
}

const FULL_SHOE_SLOT: ArtSlot = { x: 50, y: 226, w: 100, ratio: 0.667 }
const FULL_SHOE_SLOT_SQUARE: ArtSlot = { x: 66, y: 224, w: 68, ratio: 1 }

export const FULL_ART_SLOTS: Readonly<Record<string, ArtSlot>> = {
  'cap': { x: 58, y: -6, w: 76, ratio: 1, rotate: -8 },
  'bow': { x: 126, y: 18, w: 58, ratio: 1, rotate: 10 },
  'glasses': { x: 52, y: 50, w: 96, ratio: 0.667 },
  'scarf': { x: 64, y: 112, w: 73, ratio: 1 },
  'medal': { x: 69, y: 128, w: 62, ratio: 1 },
  'shoes-first-step': FULL_SHOE_SLOT,
  'shoes-cozy': FULL_SHOE_SLOT,
  'shoes-breeze': FULL_SHOE_SLOT,
  'shoes-fins': FULL_SHOE_SLOT,
  'shoes-neon': FULL_SHOE_SLOT,
  'shoes-autumn': { x: 54, y: 226, w: 92, ratio: 0.75 },
  'shoes-snowflake': FULL_SHOE_SLOT_SQUARE
}

export function artTransform(slot: ArtSlot): string | undefined {
  if (!slot.rotate) return undefined
  const cx = slot.x + slot.w / 2
  const cy = slot.y + (slot.w * slot.ratio) / 2
  return `rotate(${slot.rotate} ${cx} ${cy})`
}
