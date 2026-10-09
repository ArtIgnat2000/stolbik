interface KeypadProps {
  onDigit: (digit: number) => void
  onErase: () => void
  disabled?: boolean
  eraseDisabled?: boolean
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function Keypad({ onDigit, onErase, disabled = false, eraseDisabled = disabled }: KeypadProps) {
  return (
    <div className="keypad" aria-label="Цифровая клавиатура">
      {DIGITS.map((digit) => (
        <button
          className="keypad-button"
          type="button"
          key={digit}
          onClick={() => onDigit(digit)}
          disabled={disabled}
          aria-label={`Цифра ${digit}`}
        >
          {digit}
        </button>
      ))}
      <span className="keypad-spacer" aria-hidden="true" />
      <button className="keypad-button keypad-zero" type="button" onClick={() => onDigit(0)} disabled={disabled} aria-label="Цифра 0">0</button>
      <button className="keypad-button keypad-erase" type="button" onClick={onErase} disabled={eraseDisabled} aria-label="Стереть последнюю цифру">
        <span aria-hidden="true">⌫</span>
      </button>
    </div>
  )
}
