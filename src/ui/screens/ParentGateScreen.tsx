import { useState, type FormEvent } from 'react'

interface ParentGateScreenProps {
  left: number
  right: number
  onCorrect: () => void
  onCancel: () => void
}

export function ParentGateScreen({ left, right, onCorrect, onCancel }: ParentGateScreenProps) {
  const [answer, setAnswer] = useState('')
  const [message, setMessage] = useState('')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (Number(answer) === left + right) {
      onCorrect()
      return
    }
    setAnswer('')
    setMessage('Ответ не совпал. Попробуй ещё раз или вернись назад.')
  }

  return (
    <main className="parent-gate-page page-shell">
      <header className="app-header"><div className="brand-lockup"><span className="brand-mark">+</span><span>СТОЛБИК</span></div><span className="parent-area-label">Для взрослых</span></header>
      <section className="parent-gate-card panel-card">
        <div className="gate-icon" aria-hidden="true">🔐</div>
        <p className="eyebrow">РОДИТЕЛЬСКАЯ ЗОНА</p>
        <h1>Небольшая проверка</h1>
        <p>Сколько будет <strong>{left} + {right}</strong>? Это помогает случайно не открыть настройки во время игры.</p>
        <form className="gate-form" onSubmit={submit}>
          <label className="visually-hidden" htmlFor="parent-answer">Ответ на пример</label>
          <input id="parent-answer" className="text-input gate-input" type="number" inputMode="numeric" value={answer} onChange={(event) => setAnswer(event.target.value)} autoFocus required />
          {message && <p className="gate-error" role="alert">{message}</p>}
          <button className="primary-button full-width" type="submit">Открыть настройки</button>
          <button className="text-button gate-cancel" type="button" onClick={onCancel}>Вернуться домой</button>
        </form>
      </section>
    </main>
  )
}
