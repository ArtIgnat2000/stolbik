import type { ColumnAnalysis, ColumnStep } from '../../engine/column'
import { placeTitle } from '../placeNames'
import type { TokenSize } from './PlaceTokens'
import { PlaceTokens, placeTokensLabel } from './PlaceTokens'
import { getStepTask, type TaskSlot } from '../screens/stepTask'

export interface PlaceValueBoardProps {
  analysis: ColumnAnalysis
  answers: Readonly<Record<number, number>>
  activePlace: number | null
  currentStep: ColumnStep | null
}

function digitAt(value: number, place: number): number {
  return Math.floor(value / 10 ** place) % 10
}

function SlotView({ slot, size }: { slot: TaskSlot; size: TokenSize }) {
  if (slot.kind === 'op') {
    return <span className="place-task-op">{slot.text}</span>
  }
  if (slot.kind === 'slot') {
    return (
      <span className="place-task-slot" aria-hidden="true">
        ?
      </span>
    )
  }
  return (
    <PlaceTokens
      place={slot.place}
      count={slot.count}
      tone={slot.tone}
      size={size}
      crossed={slot.crossed}
      label={placeTokensLabel(slot.place, slot.count)}
    />
  )
}

/**
 * Наглядная модель примера: под каждым разрядом — фишки, из которых состоит цифра.
 * Активный разряд подсвечен, над ним написано, что сделать, почему и куда записать ответ.
 */
export function PlaceValueBoard({ analysis, answers, activePlace, currentStep }: PlaceValueBoardProps) {
  const places = Array.from({ length: analysis.columnCount }, (_, index) => analysis.columnCount - index - 1)
  const task = currentStep ? getStepTask(currentStep, analysis.operation) : null
  const sign = analysis.operation === 'add' ? '+' : '−'

  return (
    <section className="place-board" aria-labelledby="place-board-title" data-testid="place-board">
      <div className="place-board-head">
        <div className="place-board-heading">
          <p className="eyebrow" id="place-board-title">
            НАГЛЯДНАЯ МОДЕЛЬ
          </p>
          <p className="place-board-sub">Цифра показывает, сколько фишек в разряде</p>
        </div>
        <div className="place-board-legend" role="group" aria-label="Значение фишек">
          <span className="place-board-key">
            <PlaceTokens place={0} count={1} label="1 точка" />
            точка = 1
          </span>
          <span className="place-board-key">
            <PlaceTokens place={1} count={1} label="1 треугольник" />
            треугольник = 10 точек
          </span>
          <span className="place-board-key">
            <PlaceTokens place={2} count={1} label="1 квадрат" />
            квадрат = 100 точек
          </span>
        </div>
      </div>

      <div className="place-board-cells">
        {places.map((place) => {
          const aPresent = place < String(analysis.a).length
          const bPresent = place < String(analysis.b).length
          const aDigit = digitAt(analysis.a, place)
          const bDigit = digitAt(analysis.b, place)
          const answer = answers[place]
          return (
            <div
              className={`place-cell${place === activePlace ? ' place-cell-active' : ''}`}
              key={place}
              aria-current={place === activePlace ? 'step' : undefined}
            >
              <span className="place-cell-name">{placeTitle(place)}</span>
              <div className="place-cell-row">
                {aPresent ? (
                  <>
                    <span className="place-cell-digit">{aDigit}</span>
                    <PlaceTokens place={place} count={aDigit} tone="first" label={placeTokensLabel(place, aDigit)} />
                  </>
                ) : (
                  <span className="place-cell-empty">пока пусто</span>
                )}
              </div>
              <div className="place-cell-row">
                {bPresent ? (
                  <>
                    <span className="place-cell-sign" aria-hidden="true">
                      {sign}
                    </span>
                    <span className="place-cell-digit">{bDigit}</span>
                    <PlaceTokens place={place} count={bDigit} tone="second" label={placeTokensLabel(place, bDigit)} />
                  </>
                ) : (
                  <span className="place-cell-empty" aria-hidden="true">
                    —
                  </span>
                )}
              </div>
              {answer !== undefined && (
                <div className="place-cell-row place-cell-row-answer">
                  <span className="place-cell-sign" aria-hidden="true">
                    =
                  </span>
                  <span className="place-cell-digit">{answer}</span>
                  <PlaceTokens place={place} count={answer} tone="answer" label={placeTokensLabel(place, answer)} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {task && (
        <div className="place-task" aria-live="polite">
          <div className="place-task-head">
            <span className="place-task-badge">СЕЙЧАС СЧИТАЕМ</span>
            <strong className="place-task-place">{task.placeTitle}</strong>
          </div>
          <div className="place-task-model">
            {task.slots.map((slot, index) => (
              <SlotView slot={slot} size="md" key={index} />
            ))}
          </div>
          <p className="place-task-question">{task.question}</p>
          {task.exchange && (
            <div className="place-task-exchange">
              {task.exchange.steps.map((step, index) => (
                <span className="place-task-exchange-step" key={index}>
                  {step.from.map((slot, slotIndex) => (
                    <SlotView slot={slot} size="sm" key={slotIndex} />
                  ))}
                  <span className="place-task-arrow" aria-hidden="true">
                    →
                  </span>
                  {step.to.map((slot, slotIndex) => (
                    <SlotView slot={slot} size="sm" key={slotIndex} />
                  ))}
                </span>
              ))}
              <span className="place-task-exchange-text">{task.exchange.text}</span>
            </div>
          )}
          {task.why && <p className="place-task-why">{task.why}</p>}
          <p className="place-task-instruction">{task.instruction}</p>
        </div>
      )}
    </section>
  )
}
