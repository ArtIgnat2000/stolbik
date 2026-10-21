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

interface ShareAppProps {
  /** Короткий вид — для экрана выбора профиля, без пошаговой инструкции */
  compact?: boolean
}

export function ShareApp({ compact = false }: ShareAppProps) {
  const url = appUrl()
  const matrix = useMemo(() => qrEncode(url), [url])
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null)
  const [zoomed, setZoomed] = useState(false)
  const nativeShare = canNativeShare()

  useEffect(() => {
    setOutcome(null)
  }, [url])

  useEffect(() => {
    if (!zoomed) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomed(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomed])

  const share = async () => setOutcome(await shareApp())
  const copy = async () => setOutcome(await copyAppLink())

  return (
    <section className={`panel-card share-app${compact ? ' share-app-compact' : ''}`} aria-label="Передать приложение">
      <div className="share-app-head">
        <span className="share-app-icon" aria-hidden="true">📤</span>
        <div className="share-app-title-wrap">
          <h3>Передать приложение</h3>
          <p className="share-app-subtitle">
            Ссылка откроет СТОЛБИК на другом телефоне или планшете. Прогресс у каждого ученика свой.
          </p>
        </div>
      </div>

      <div className="share-app-body">
        {matrix ? (
          <button
            type="button"
            className="share-qr-button"
            onClick={() => setZoomed(true)}
            aria-label="Показать QR-код крупно"
          >
            <QrImage matrix={matrix} className="share-qr-art" />
            <span className="share-qr-hint">Нажми, чтобы увеличить</span>
          </button>
        ) : (
          <div className="share-qr-missing">QR-код не помещается — отправь ссылку текстом</div>
        )}

        <div className="share-app-controls">
          <div className="share-link" title={url}>{linkLabel(url)}</div>
          <div className="share-app-buttons">
            {nativeShare && (
              <button type="button" className="primary-button full-width" onClick={() => void share()}>
                📤 Поделиться ссылкой
              </button>
            )}
            <button type="button" className="secondary-button full-width" onClick={() => void copy()}>
              🔗 Скопировать ссылку
            </button>
          </div>

          {outcome === 'copied' && <div className="share-note" role="status">Ссылка скопирована ✓</div>}
          {outcome === 'shared' && <div className="share-note" role="status">Отправлено ✓</div>}
          {outcome === 'cancelled' && (
            <div className="share-note" role="status">Окно закрылось. Можно просто скопировать ссылку.</div>
          )}
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
        </div>
      </div>

      {!compact && (
        <ol className="share-steps">
          <li>Наведи камеру на QR-код или отправь ссылку в мессенджере.</li>
          <li>На другом телефоне открой ссылку в браузере.</li>
          <li>Меню браузера → «Добавить на экран» — и приложение работает без интернета.</li>
        </ol>
      )}

      {zoomed && matrix && (
        <div
          className="share-zoom-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="QR-код для передачи приложения"
          onClick={() => setZoomed(false)}
        >
          <div className="share-zoom-card" onClick={(event) => event.stopPropagation()}>
            <QrImage matrix={matrix} className="share-zoom-art" />
            <div className="share-zoom-link">{linkLabel(url)}</div>
            <button type="button" className="primary-button full-width" onClick={() => setZoomed(false)}>
              Закрыть
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
