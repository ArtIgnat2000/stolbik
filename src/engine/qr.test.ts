import { describe, expect, it } from 'vitest'
import { qrEncode } from './qr'
import { qrPngBytes, qrPngDataUrl } from './qrPng'

describe('генерация QR-кода для ссылки на приложение', () => {
  it('кодирует адрес приложения и формирует корректный PNG', () => {
    const matrix = qrEncode('https://artignat2000.github.io/stolbik/')
    expect(matrix).not.toBeNull()
    expect(matrix!.size).toBeGreaterThanOrEqual(21)
    expect(matrix!.modules).toHaveLength(matrix!.size * matrix!.size)

    const png = qrPngBytes(matrix!)
    expect(Array.from(png.slice(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(qrPngDataUrl(matrix!).startsWith('data:image/png;base64,')).toBe(true)
  })

  it('возвращает null для слишком длинной строки', () => {
    expect(qrEncode('https://example.com/' + 'a'.repeat(400))).toBeNull()
  })
})
