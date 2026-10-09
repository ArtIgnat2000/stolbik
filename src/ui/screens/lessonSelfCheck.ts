import type { ColumnStep, Operation } from '../../engine/column'

const PLACE_LABELS: Readonly<Record<number, string>> = Object.freeze({
  0: 'Единицы',
  1: 'Десятки',
  2: 'Сотни',
  3: 'Тысячи'
})

const PLACE_NAMES: Readonly<Record<number, string>> = Object.freeze({
  0: 'единиц',
  1: 'десятков',
  2: 'сотен',
  3: 'тысяч'
})

function placeLabel(place: number): string {
  return PLACE_LABELS[place] ?? 'Старший разряд'
}

function placeName(place: number): string {
  return PLACE_NAMES[place] ?? 'старших разрядов'
}

export function getSelfCheckStepTitle(step: ColumnStep): string {
  return step.isFinalCarry ? 'Перенос' : placeLabel(step.place)
}

export function getSelfCheckStepText(step: ColumnStep, operation: Operation): string {
  if (step.isFinalCarry) {
    return `Записываем ${step.carryIn} в разряд ${placeName(step.place)}.`
  }

  if (operation === 'add') {
    const carryIn = step.carryIn > 0 ? ` + ${step.carryIn} (перенос)` : ''
    const result = step.carryOut > 0
      ? `Пишем ${step.expectedDigit}, переносим ${step.carryOut}.`
      : `Пишем ${step.expectedDigit}.`
    return `${step.aDigit} + ${step.bDigit}${carryIn} = ${step.subtotal}. ${result}`
  }

  const calculation = `${step.aDigit} − ${step.bDigit} = ${step.expectedDigit}.`
  if (!step.borrow) return `${calculation} Пишем ${step.expectedDigit}.`

  const changes = step.borrow.changes
    .filter((change) => change.place > step.place)
    .map((change) => `${placeLabel(change.place).toLowerCase()} ${change.before} → ${change.after}`)
    .join('; ')
  const regrouping = changes ? `Размен: ${changes}. ` : ''
  return `${regrouping}${calculation} Пишем ${step.expectedDigit}.`
}
