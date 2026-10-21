// ── QR-код как PNG-картинка ────────────────────────────────────────────────
// Растровый PNG защищает QR-код от инверсии цветов в принудительной тёмной теме
// мобильных браузеров (Samsung Internet, Chrome Auto Dark).

import type { QrMatrix } from './qr'

export const QR_QUIET_ZONE = 4
export const QR_MODULE_PX = 8

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function adler32(bytes: Uint8Array): number {
  let a = 1
  let b = 0
  for (let i = 0; i < bytes.length; i += 1) {
    a = (a + bytes[i]!) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

function zlibStored(data: Uint8Array): Uint8Array {
  const out: number[] = [0x78, 0x01]
  let offset = 0
  do {
    const len = Math.min(0xffff, data.length - offset)
    const last = offset + len >= data.length ? 1 : 0
    out.push(last, len & 0xff, (len >>> 8) & 0xff, ~len & 0xff, (~len >>> 8) & 0xff)
    for (let i = 0; i < len; i += 1) out.push(data[offset + i]!)
    offset += len
  } while (offset < data.length)
  const adler = adler32(data)
  out.push((adler >>> 24) & 0xff, (adler >>> 16) & 0xff, (adler >>> 8) & 0xff, adler & 0xff)
  return new Uint8Array(out)
}

export function qrPngBytes(matrix: QrMatrix, modulePx: number = QR_MODULE_PX): Uint8Array {
  const total = matrix.size + QR_QUIET_ZONE * 2
  const side = total * modulePx
  const rowBytes = Math.ceil(side / 8)
  const raw = new Uint8Array(side * (rowBytes + 1))

  for (let y = 0; y < side; y += 1) {
    const rowStart = y * (rowBytes + 1)
    raw[rowStart] = 0
    const my = Math.floor(y / modulePx) - QR_QUIET_ZONE
    for (let x = 0; x < side; x += 1) {
      const mx = Math.floor(x / modulePx) - QR_QUIET_ZONE
      const inCode = mx >= 0 && mx < matrix.size && my >= 0 && my < matrix.size
      const dark = inCode && matrix.modules[my * matrix.size + mx]
      if (!dark) raw[rowStart + 1 + (x >> 3)]! |= 0x80 >> (x & 7)
    }
  }

  const header = new Uint8Array(13)
  const headerView = new DataView(header.buffer)
  headerView.setUint32(0, side)
  headerView.setUint32(4, side)
  header[8] = 1
  header[9] = 0
  header[10] = 0
  header[11] = 0
  header[12] = 0

  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const parts = [
    signature,
    chunk('IHDR', header),
    chunk('IDAT', zlibStored(raw)),
    chunk('IEND', new Uint8Array(0))
  ]
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0)
  const png = new Uint8Array(totalLength)
  let offset = 0
  for (const part of parts) {
    png.set(part, offset)
    offset += part.length
  }
  return png
}

export function qrPngDataUrl(matrix: QrMatrix, modulePx: number = QR_MODULE_PX): string {
  return `data:image/png;base64,${base64(qrPngBytes(matrix, modulePx))}`
}

export function qrPngSide(matrix: QrMatrix, modulePx: number = QR_MODULE_PX): number {
  return (matrix.size + QR_QUIET_ZONE * 2) * modulePx
}

function base64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x2000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}
