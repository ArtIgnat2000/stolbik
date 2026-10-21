// ── QR-код без внешних зависимостей (ISO/IEC 18004) ─────────────────────────
// Байтовый режим, уровни коррекции L и M, версии 1..10 (до 213 байт).
// Работает полностью офлайн.

export type QrEcc = 'L' | 'M'

export interface QrMatrix {
  /** Сторона матрицы в модулях (без «тихой зоны») */
  size: number
  /** Построчно: true — тёмный модуль */
  modules: boolean[]
  version: number
  ecc: QrEcc
  /** Выбранная маска 0..7 */
  mask: number
}

const TOTAL_CODEWORDS = [26, 44, 70, 100, 134, 172, 196, 242, 292, 346]

const ECC_CODEWORDS: Record<QrEcc, number[]> = {
  L: [7, 10, 15, 20, 26, 36, 40, 48, 60, 72],
  M: [10, 16, 26, 36, 48, 64, 72, 88, 110, 130]
}

const ECC_BLOCKS: Record<QrEcc, number[]> = {
  L: [1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
  M: [1, 1, 1, 2, 2, 4, 4, 4, 5, 5]
}

const ALIGNMENT_CENTERS: number[][] = [
  [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]
]

export const QR_MAX_VERSION = TOTAL_CODEWORDS.length

export function qrByteCapacity(version: number, ecc: QrEcc): number {
  if (version < 1 || version > QR_MAX_VERSION) return 0
  const dataCodewords = TOTAL_CODEWORDS[version - 1]! - ECC_CODEWORDS[ecc][version - 1]!
  const headerBits = 4 + (version < 10 ? 8 : 16)
  return Math.floor((dataCodewords * 8 - headerBits) / 8)
}

export function qrPickVersion(byteLength: number, ecc: QrEcc = 'M'): number | null {
  for (let version = 1; version <= QR_MAX_VERSION; version++) {
    if (qrByteCapacity(version, ecc) >= byteLength) return version
  }
  return null
}

const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)

;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255]!
})()

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a]! + GF_LOG[b]!]!
}

function generatorPoly(degree: number): number[] {
  let poly = [1]
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j]! ^= gfMul(poly[j]!, 1)
      next[j + 1]! ^= gfMul(poly[j]!, GF_EXP[i]!)
    }
    poly = next
  }
  return poly
}

function rsEncode(data: number[], ecCount: number): number[] {
  const gen = generatorPoly(ecCount)
  const remainder = new Array<number>(ecCount).fill(0)
  for (const byte of data) {
    const factor = byte ^ remainder[0]!
    remainder.shift()
    remainder.push(0)
    for (let i = 0; i < ecCount; i++) {
      remainder[i]! ^= gfMul(gen[i + 1]!, factor)
    }
  }
  return remainder
}

function utf8Bytes(text: string): number[] {
  if (typeof TextEncoder !== 'undefined') return Array.from(new TextEncoder().encode(text))
  const bytes: number[] = []
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (code < 0x80) bytes.push(code)
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    else bytes.push(
      0xf0 | (code >> 18),
      0x80 | ((code >> 12) & 0x3f),
      0x80 | ((code >> 6) & 0x3f),
      0x80 | (code & 0x3f)
    )
  }
  return bytes
}

class BitBuffer {
  bits: number[] = []

  put(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >> i) & 1)
  }
}

function buildDataCodewords(bytes: number[], version: number, ecc: QrEcc): number[] {
  const totalData = TOTAL_CODEWORDS[version - 1]! - ECC_CODEWORDS[ecc][version - 1]!
  const buffer = new BitBuffer()
  buffer.put(0b0100, 4)
  buffer.put(bytes.length, version < 10 ? 8 : 16)
  for (const byte of bytes) buffer.put(byte, 8)

  const capacityBits = totalData * 8
  const terminator = Math.min(4, Math.max(0, capacityBits - buffer.bits.length))
  for (let i = 0; i < terminator; i++) buffer.bits.push(0)
  while (buffer.bits.length % 8 !== 0) buffer.bits.push(0)

  const codewords: number[] = []
  for (let i = 0; i < buffer.bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j++) byte = (byte << 1) | buffer.bits[i + j]!
    codewords.push(byte)
  }
  let pad = 0xec
  while (codewords.length < totalData) {
    codewords.push(pad)
    pad = pad === 0xec ? 0x11 : 0xec
  }
  return codewords
}

export interface QrEccLayout {
  totalCodewords: number
  blockCount: number
  ecPerBlock: number
  blocksInGroup1: number
  dataInGroup1: number
  blocksInGroup2: number
  dataInGroup2: number
}

export function qrEccLayout(version: number, ecc: QrEcc): QrEccLayout {
  const totalCodewords = TOTAL_CODEWORDS[version - 1]!
  const totalEcc = ECC_CODEWORDS[ecc][version - 1]!
  const blockCount = ECC_BLOCKS[ecc][version - 1]!
  const totalData = totalCodewords - totalEcc
  const blocksInGroup2 = totalCodewords % blockCount
  const blocksInGroup1 = blockCount - blocksInGroup2
  const dataInGroup1 = Math.floor(totalData / blockCount)
  return {
    totalCodewords,
    blockCount,
    ecPerBlock: Math.floor(totalCodewords / blockCount) - dataInGroup1,
    blocksInGroup1,
    dataInGroup1,
    blocksInGroup2,
    dataInGroup2: dataInGroup1 + 1
  }
}

function interleaveCodewords(dataCodewords: number[], version: number, ecc: QrEcc): number[] {
  const layout = qrEccLayout(version, ecc)
  const { blockCount, blocksInGroup1, dataInGroup1, dataInGroup2, ecPerBlock } = layout

  const dataBlocks: number[][] = []
  const ecBlocks: number[][] = []
  let offset = 0
  for (let block = 0; block < blockCount; block++) {
    const size = block < blocksInGroup1 ? dataInGroup1 : dataInGroup2
    const chunk = dataCodewords.slice(offset, offset + size)
    dataBlocks.push(chunk)
    ecBlocks.push(rsEncode(chunk, ecPerBlock))
    offset += size
  }

  const result: number[] = []
  const maxData = Math.max(...dataBlocks.map((block) => block.length))
  for (let i = 0; i < maxData; i++) {
    for (const block of dataBlocks) if (i < block.length) result.push(block[i]!)
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const block of ecBlocks) result.push(block[i]!)
  }
  return result
}

const MASKS: ReadonlyArray<(row: number, col: number) => boolean> = [
  (row, col) => (row + col) % 2 === 0,
  (row) => row % 2 === 0,
  (_row, col) => col % 3 === 0,
  (row, col) => (row + col) % 3 === 0,
  (row, col) => (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0,
  (row, col) => ((row * col) % 2) + ((row * col) % 3) === 0,
  (row, col) => (((row * col) % 2) + ((row * col) % 3)) % 2 === 0,
  (row, col) => (((row + col) % 2) + ((row * col) % 3)) % 2 === 0
]

function buildReserved(size: number, version: number): boolean[] {
  const reserved = new Array<boolean>(size * size).fill(false)
  const mark = (row: number, col: number) => {
    if (row >= 0 && row < size && col >= 0 && col < size) reserved[row * size + col] = true
  }

  for (const [row, col] of [[0, 0], [0, size - 7], [size - 7, 0]] as const) {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) mark(row + r, col + c)
  }
  for (let i = 0; i < size; i++) {
    mark(6, i)
    mark(i, 6)
  }
  const centers = ALIGNMENT_CENTERS[version - 1]!
  for (const row of centers) {
    for (const col of centers) {
      const corner = (row === 6 && col === 6) || (row === 6 && col === size - 7) || (row === size - 7 && col === 6)
      if (corner) continue
      for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) mark(row + r, col + c)
    }
  }
  for (let i = 0; i < 9; i++) {
    mark(8, i)
    mark(i, 8)
  }
  for (let i = 0; i < 8; i++) {
    mark(8, size - 1 - i)
    mark(size - 1 - i, 8)
  }
  mark(size - 8, 8)
  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      mark(Math.floor(i / 3), size - 11 + (i % 3))
      mark(size - 11 + (i % 3), Math.floor(i / 3))
    }
  }
  return reserved
}

function bchRemainder(value: number, generator: number): number {
  let rest = value
  const genBits = 32 - Math.clz32(generator)
  while (32 - Math.clz32(rest) >= genBits) {
    rest ^= generator << (32 - Math.clz32(rest) - genBits)
  }
  return rest
}

export function qrFormatBits(ecc: QrEcc, mask: number): number {
  const level = ecc === 'L' ? 0b01 : 0b00
  const data = (level << 3) | mask
  const encoded = (data << 10) | bchRemainder(data << 10, 0b10100110111)
  return encoded ^ 0b101010000010010
}

export function qrVersionBits(version: number): number {
  return (version << 12) | bchRemainder(version << 12, 0b1111100100101)
}

function drawFunctionPatterns(matrix: boolean[], size: number, version: number): void {
  const set = (row: number, col: number, dark: boolean) => {
    matrix[row * size + col] = dark
  }

  for (const [row, col] of [[0, 0], [0, size - 7], [size - 7, 0]] as const) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const edge = r === 0 || r === 6 || c === 0 || c === 6
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4
        set(row + r, col + c, edge || core)
      }
    }
  }
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0
    set(6, i, dark)
    set(i, 6, dark)
  }
  for (const row of ALIGNMENT_CENTERS[version - 1]!) {
    for (const col of ALIGNMENT_CENTERS[version - 1]!) {
      const corner = (row === 6 && col === 6) || (row === 6 && col === size - 7) || (row === size - 7 && col === 6)
      if (corner) continue
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const ring = Math.max(Math.abs(r), Math.abs(c))
          set(row + r, col + c, ring !== 1)
        }
      }
    }
  }
  set(size - 8, 8, true)
}

function placeFormatInfo(matrix: boolean[], size: number, ecc: QrEcc, mask: number): void {
  const bits = qrFormatBits(ecc, mask)
  const set = (row: number, col: number, dark: boolean) => {
    matrix[row * size + col] = dark
  }
  for (let i = 0; i < 15; i++) {
    const dark = ((bits >> i) & 1) === 1
    if (i < 6) set(i, 8, dark)
    else if (i < 8) set(i + 1, 8, dark)
    else set(size - 15 + i, 8, dark)
    if (i < 8) set(8, size - 1 - i, dark)
    else if (i === 8) set(8, 7, dark)
    else set(8, 15 - i - 1, dark)
  }
}

function placeVersionInfo(matrix: boolean[], size: number, version: number): void {
  if (version < 7) return
  const bits = qrVersionBits(version)
  const set = (row: number, col: number, dark: boolean) => {
    matrix[row * size + col] = dark
  }
  for (let i = 0; i < 18; i++) {
    const dark = ((bits >> i) & 1) === 1
    set(Math.floor(i / 3), size - 11 + (i % 3), dark)
    set(size - 11 + (i % 3), Math.floor(i / 3), dark)
  }
}

function placeData(matrix: boolean[], size: number, reserved: boolean[], codewords: number[], mask: number): void {
  const maskFn = MASKS[mask]!
  let bitIndex = 7
  let byteIndex = 0
  let row = size - 1
  let direction = -1

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--
    for (;;) {
      for (let c = 0; c < 2; c++) {
        const target = col - c
        const index = row * size + target
        if (reserved[index]) continue
        let dark = false
        if (byteIndex < codewords.length) {
          dark = ((codewords[byteIndex]! >> bitIndex) & 1) === 1
        }
        if (maskFn(row, target)) dark = !dark
        matrix[index] = dark
        bitIndex--
        if (bitIndex < 0) {
          byteIndex++
          bitIndex = 7
        }
      }
      row += direction
      if (row < 0 || row >= size) {
        row -= direction
        direction = -direction
        break
      }
    }
  }
}

function maskPenalty(matrix: boolean[], size: number): number {
  let penalty = 0
  const linePenalty = (get: (i: number, j: number) => boolean) => {
    for (let i = 0; i < size; i++) {
      let run = 1
      for (let j = 1; j < size; j++) {
        if (get(i, j) === get(i, j - 1)) run++
        else {
          if (run >= 5) penalty += 3 + (run - 5)
          run = 1
        }
      }
      if (run >= 5) penalty += 3 + (run - 5)
    }
  }
  linePenalty((i, j) => matrix[i * size + j]!)
  linePenalty((i, j) => matrix[j * size + i]!)

  for (let row = 0; row < size - 1; row++) {
    for (let col = 0; col < size - 1; col++) {
      const a = matrix[row * size + col]!
      if (
        a === matrix[row * size + col + 1] &&
        a === matrix[(row + 1) * size + col] &&
        a === matrix[(row + 1) * size + col + 1]
      ) {
        penalty += 3
      }
    }
  }

  const finderLike = [true, false, true, true, true, false, true, false, false, false, false]
  const finderLikeReverse = [...finderLike].reverse()
  const matches = (values: boolean[], at: number, pattern: boolean[]) =>
    pattern.every((expected, offset) => values[at + offset] === expected)
  for (let i = 0; i < size; i++) {
    const horizontal: boolean[] = []
    const vertical: boolean[] = []
    for (let j = 0; j < size; j++) {
      horizontal.push(matrix[i * size + j]!)
      vertical.push(matrix[j * size + i]!)
    }
    for (let at = 0; at + finderLike.length <= size; at++) {
      if (matches(horizontal, at, finderLike) || matches(horizontal, at, finderLikeReverse)) penalty += 40
      if (matches(vertical, at, finderLike) || matches(vertical, at, finderLikeReverse)) penalty += 40
    }
  }

  const dark = matrix.filter(Boolean).length
  const percent = (dark * 100) / (size * size)
  penalty += Math.floor(Math.abs(percent - 50) / 5) * 10

  return penalty
}

export function qrEncode(text: string, options: { ecc?: QrEcc } = {}): QrMatrix | null {
  const bytes = utf8Bytes(text)
  const preferred = options.ecc ?? 'M'
  let ecc: QrEcc = preferred
  let version = qrPickVersion(bytes.length, preferred)
  if (version === null && preferred === 'M') {
    ecc = 'L'
    version = qrPickVersion(bytes.length, 'L')
  }
  if (version === null) return null

  const size = version * 4 + 17
  const codewords = interleaveCodewords(buildDataCodewords(bytes, version, ecc), version, ecc)
  const reserved = buildReserved(size, version)

  let best: { mask: number; matrix: boolean[]; penalty: number } | null = null
  for (let mask = 0; mask < 8; mask++) {
    const matrix = new Array<boolean>(size * size).fill(false)
    drawFunctionPatterns(matrix, size, version)
    placeData(matrix, size, reserved, codewords, mask)
    placeFormatInfo(matrix, size, ecc, mask)
    placeVersionInfo(matrix, size, version)
    const penalty = maskPenalty(matrix, size)
    if (!best || penalty < best.penalty) best = { mask, matrix, penalty }
  }

  return { size, modules: best!.matrix, version, ecc, mask: best!.mask }
}
