import type { ColumnStep } from '../../engine/column'
import { placeTitle } from '../placeNames'

export interface PlaceStepperProps {
  steps: readonly ColumnStep[]
  /** Индекс текущего разряда; равный длине списка — все разряды пройдены. */
  currentIndex: number
}

/**
 * Порядок разрядов: пройденные отмечены галочкой, текущий подсвечен.
 * Ребёнок видит, в каком он разряде и что будет дальше, — без абстрактных «шаг 1 из 1».
 */
export function PlaceStepper({ steps, currentIndex }: PlaceStepperProps) {
  return (
    <div className="place-stepper" role="group" aria-label="Разряды по порядку">
      {steps.map((step, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'next'
        return (
          <span className={`place-chip place-chip-${state}`} key={step.place}>
            <span className="place-chip-mark" aria-hidden="true">
              {state === 'done' ? '✓' : state === 'current' ? '●' : '○'}
            </span>
            {placeTitle(step.place)}
          </span>
        )
      })}
    </div>
  )
}
