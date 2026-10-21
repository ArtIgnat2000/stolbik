import { useMemo, useState } from 'react'
import { LEVELS, type LevelId, type LevelInfo } from '../../content/levels'
import { analyzeColumn, type Operation } from '../../engine/column'
import { getHighestUnlockedLevel, getLevelProgress, type ChildProfile } from '../../state/profile'
import { ColumnDisplay } from '../components/ColumnDisplay'
import { plural, CROWNS, EXAMPLES, MISTAKES } from '../plural'

interface TopicsScreenProps {
  profile: ChildProfile
  onStartLesson: (levelId: LevelId) => void
}

type TopicFilter = 'all' | 'двузначные' | 'трёхзначные' | 'add' | 'subtract'

const SAMPLE_EXAMPLES: Readonly<Record<LevelId, { a: number; b: number; operation: Operation }>> = Object.freeze({
  1: { a: 34, b: 25, operation: 'add' },
  2: { a: 32, b: 8, operation: 'add' },
  3: { a: 21, b: 39, operation: 'add' },
  4: { a: 36, b: 7, operation: 'add' },
  5: { a: 36, b: 17, operation: 'add' },
  6: { a: 32, b: 5, operation: 'subtract' },
  7: { a: 32, b: 15, operation: 'subtract' },
  8: { a: 243, b: 126, operation: 'add' },
  9: { a: 204, b: 138, operation: 'add' },
  10: { a: 176, b: 145, operation: 'add' },
  11: { a: 243, b: 114, operation: 'subtract' },
  12: { a: 300, b: 156, operation: 'subtract' },
  13: { a: 458, b: 274, operation: 'add' }
})

export function TopicsScreen({ profile, onStartLesson }: TopicsScreenProps) {
  const [filter, setFilter] = useState<TopicFilter>('all')
  const [openLevelId, setOpenLevelId] = useState<LevelId | null>(null)
  const unlocked = getHighestUnlockedLevel(profile)

  const filteredLevels = useMemo(() => {
    return LEVELS.filter((level) => {
      if (filter === 'all') return true
      if (filter === 'двузначные' || filter === 'трёхзначные') return level.band === filter
      if (filter === 'add') return level.operation === 'add' || level.operation === 'mixed'
      if (filter === 'subtract') return level.operation === 'subtract' || level.operation === 'mixed'
      return true
    })
  }, [filter])

  const selectedLevel: LevelInfo | null = openLevelId
    ? LEVELS.find((level) => level.id === openLevelId) ?? null
    : null

  const sampleAnalysis = useMemo(() => {
    if (!selectedLevel) return null
    const sample = SAMPLE_EXAMPLES[selectedLevel.id]
    return analyzeColumn(sample.a, sample.b, sample.operation)
  }, [selectedLevel])

  const sampleAnswers = useMemo(() => {
    if (!sampleAnalysis) return {}
    const out: Record<number, number> = {}
    sampleAnalysis.resultDigits.forEach((digit, index) => {
      out[index] = digit
    })
    return out
  }, [sampleAnalysis])

  return (
    <main className="topics-page page-shell">
      <div className="topics-page-intro">
        <p className="eyebrow">РАЗРЯДЫ И ПРИЁМЫ СЧЁТА</p>
        <h1>Справочник тем 📖</h1>
        <p className="muted">
          Все 13 тем программы с наглядным разбором в столбик и правилами перехода через разряд.
        </p>
      </div>

      <section className="topics-guide-card panel-card" aria-label="Памятка по разрядам">
        <div className="topics-guide-items">
          <div className="topics-guide-item">
            <span className="topics-guide-symbol topics-guide-unit" aria-hidden="true">•</span>
            <div>
              <strong>Единицы (ед.)</strong>
              <span>Считаем первыми — справа</span>
            </div>
          </div>
          <div className="topics-guide-item">
            <span className="topics-guide-symbol topics-guide-ten" aria-hidden="true">▲</span>
            <div>
              <strong>1 десяток = 10 единиц</strong>
              <span>10 точек собираем в треугольник</span>
            </div>
          </div>
          <div className="topics-guide-item">
            <span className="topics-guide-symbol topics-guide-hundred" aria-hidden="true">10▲</span>
            <div>
              <strong>1 сотня = 10 десятков</strong>
              <span>10 десятков собираем в сотню</span>
            </div>
          </div>
        </div>
      </section>

      <div className="topics-filter-row" role="group" aria-label="Фильтр тем">
        <button
          type="button"
          className={`filter-chip${filter === 'all' ? ' filter-chip-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Все ({LEVELS.length})
        </button>
        <button
          type="button"
          className={`filter-chip${filter === 'двузначные' ? ' filter-chip-active' : ''}`}
          onClick={() => setFilter('двузначные')}
        >
          🔢 Двузначные
        </button>
        <button
          type="button"
          className={`filter-chip${filter === 'трёхзначные' ? ' filter-chip-active' : ''}`}
          onClick={() => setFilter('трёхзначные')}
        >
          💯 Трёхзначные
        </button>
        <button
          type="button"
          className={`filter-chip${filter === 'add' ? ' filter-chip-active' : ''}`}
          onClick={() => setFilter('add')}
        >
          ➕ Сложение
        </button>
        <button
          type="button"
          className={`filter-chip${filter === 'subtract' ? ' filter-chip-active' : ''}`}
          onClick={() => setFilter('subtract')}
        >
          ➖ Вычитание
        </button>
      </div>

      <div className="topics-grid">
        {filteredLevels.map((level) => {
          const progress = getLevelProgress(profile, level.id)
          const isUnlocked = level.id <= unlocked
          const tone =
            progress.crowns >= 3
              ? 'topic-chip-good'
              : progress.crowns >= 1
                ? 'topic-chip-mid'
                : progress.errors > 0
                  ? 'topic-chip-weak'
                  : ''
          return (
            <button
              type="button"
              key={level.id}
              className={`topic-card panel-card ${tone}`.trim()}
              onClick={() => setOpenLevelId(level.id)}
            >
              <span
                className={`level-number${level.operation === 'subtract' ? ' level-number-subtract' : ''}${level.operation === 'mixed' ? ' level-number-mixed' : ''}`}
              >
                {level.operation === 'add' ? '+' : level.operation === 'subtract' ? '−' : '±'}
                <small>{String(level.id).padStart(2, '0')}</small>
              </span>
              <span className="topic-card-copy">
                <strong>{level.title}</strong>
                <span>{level.shortTitle} · {level.example}</span>
                <small>
                  {plural(progress.solved, EXAMPLES)} решено · {plural(progress.crowns, CROWNS)} из 3
                  {!isUnlocked ? ' · 🔒 закрыто' : ''}
                </small>
              </span>
              <span className="crowns" aria-hidden="true">
                {[1, 2, 3].map((crown) => (
                  <span className={crown <= progress.crowns ? 'crown crown-earned' : 'crown'} key={crown}>
                    ♛
                  </span>
                ))}
              </span>
            </button>
          )
        })}
      </div>

      {selectedLevel && sampleAnalysis && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setOpenLevelId(null)}>
          <div
            className="topic-modal panel-card"
            role="dialog"
            aria-modal="true"
            aria-label={`Тема ${selectedLevel.id}: ${selectedLevel.title}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="invite-sheet-head">
              <div>
                <p className="eyebrow">ТЕМА {selectedLevel.id} · {selectedLevel.band.toLocaleUpperCase('ru')}</p>
                <h2>{selectedLevel.title}</h2>
              </div>
              <button
                type="button"
                className="icon-button invite-close"
                aria-label="Закрыть окно"
                onClick={() => setOpenLevelId(null)}
              >
                ✕
              </button>
            </div>

            <p className="topic-modal-desc">{selectedLevel.description}</p>

            <div className="topic-modal-column">
              <ColumnDisplay
                analysis={sampleAnalysis}
                answers={sampleAnswers}
                visibleSteps={sampleAnalysis.steps}
                demo
              />
            </div>

            <ol className="topic-steps-list">
              {sampleAnalysis.steps.map((step) => (
                <li key={step.place}>{step.explanation}</li>
              ))}
            </ol>

            {(() => {
              const p = getLevelProgress(profile, selectedLevel.id)
              const canStart = selectedLevel.id <= unlocked
              return (
                <>
                  <div className="topic-modal-stats">
                    <span>Решено: <strong>{plural(p.solved, EXAMPLES)}</strong></span>
                    <span>Ошибок: <strong>{plural(p.errors, MISTAKES)}</strong></span>
                    <span>Короны: <strong>{p.crowns} / 3</strong></span>
                  </div>
                  <div className="topic-modal-actions">
                    {canStart && (
                      <button
                        type="button"
                        className="primary-button full-width"
                        onClick={() => {
                          const target = selectedLevel.id
                          setOpenLevelId(null)
                          onStartLesson(target)
                        }}
                      >
                        Потренировать тему →
                      </button>
                    )}
                    <button
                      type="button"
                      className="secondary-button full-width"
                      onClick={() => setOpenLevelId(null)}
                    >
                      Закрыть
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </main>
  )
}
