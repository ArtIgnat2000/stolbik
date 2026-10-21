import { useMemo } from 'react'
import { qrEncode, type QrEcc, type QrMatrix } from '../../engine/qr'
import { qrPngDataUrl } from '../../engine/qrPng'

export function QrImage({ matrix, className = '' }: { matrix: QrMatrix; className?: string }) {
  const src = useMemo(() => qrPngDataUrl(matrix), [matrix])
  return (
    <img
      className={`qr-code ${className}`.trim()}
      src={src}
      alt="QR-код со ссылкой на приложение: наведите камеру телефона"
      draggable={false}
      style={{ colorScheme: 'only light', forcedColorAdjust: 'none', background: '#ffffff' }}
    />
  )
}

export function QrCode({ text, ecc, className }: { text: string; ecc?: QrEcc; className?: string }) {
  const matrix = useMemo(() => qrEncode(text, ecc ? { ecc } : undefined), [text, ecc])
  if (!matrix) return null
  return <QrImage matrix={matrix} className={className} />
}
