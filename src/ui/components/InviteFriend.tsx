import { useEffect, useMemo, useState } from 'react'
import { qrEncode } from '../../engine/qr'
import {
  appUrl,
  canNativeShare,
  copyAppLink,
  linkLabel,
  shareApp,
  type ShareOutcome
} from '../../platform/share'
import { QrImage } from './QrCode'

interface InviteFriendProps {
  onClose: () => void
}

export function InviteFriend({ onClose }: InviteFriendProps) {
  const url = appUrl()
  const matrix = useMemo(() => qrEncode(url), [url])
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null)
  const nativeShare = canNativeShare()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const share = async () => setOutcome(await shareApp())
  const copy = async () => setOutcome(await copyAppLink())

  return (
    <div className="sheet-backdrop invite-backdrop" role="presentation" onClick={onClose}>
      <div
        className="invite-sheet panel-card"
        role="dialog"
        aria-modal="true"
        aria-label="Позови друга"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="invite-sheet-head">
          <h2>Позови друга 🤝</h2>
          <button type="button" className="icon-button invite-close" aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>
        </div>

        <p className="invite-text">
          Покажи этот код другу: он наведёт камеру телефона и откроет СТОЛБИК. Или отправь ссылку в сообщении.
        </p>

        {matrix ? (
          <div className="invite-qr">
            <QrImage matrix={matrix} className="invite-qr-art" />
          </div>
        ) : (
          <div className="share-qr-missing">QR-код не помещается — отправь ссылку текстом</div>
        )}

        <div className="share-link invite-link" title={url}>
          {linkLabel(url)}
        </div>

        <div className="invite-buttons">
          {nativeShare && (
            <button type="button" className="primary-button full-width" onClick={() => void share()}>
              📤 Отправить другу
            </button>
          )}
          <button type="button" className="secondary-button full-width" onClick={() => void copy()}>
            🔗 Скопировать ссылку
          </button>
        </div>

        {outcome === 'copied' && <div className="share-note" role="status">Ссылка скопирована ✓</div>}
        {outcome === 'shared' && <div className="share-note" role="status">Отправлено ✓</div>}
        {outcome === 'cancelled' && <div className="share-note" role="status">Ничего страшного. Можно скопировать ссылку.</div>}
        {outcome === 'manual' && (
          <div className="share-manual-wrap">
            <div className="share-note">Скопируй ссылку вручную:</div>
            <input
              className="text-input share-manual-input"
              readOnly
              value={url}
              aria-label="Ссылка на приложение"
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
        )}

        <p className="invite-foot">У каждого ученика свой прогресс и свои награды БУКа.</p>
      </div>
    </div>
  )
}
