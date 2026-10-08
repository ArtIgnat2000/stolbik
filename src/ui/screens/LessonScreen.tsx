import { useEffect, useMemo, useRef, useState } from 'react'
import { getLevelInfo, generateExample, type LevelId } from '../../content/levels'
import { analyzeColumn, type ColumnStep } from '../../engine/column'
import { playFeedback, vibrate } from '../../platform/feedback'
import type { ChildProfile } from '../../state/profile'
import { ColumnDisplay } from '../components/ColumnDisplay'
import { Keypad } from '../components/Keypad'
import { Owl } from '../components/Owl'

interface LessonScreenProps {
  profile: ChildProfile
  levelId: LevelId
  onExit: () => void
  onRecordMistake: (profileId: string, levelId: LevelId) => void
  onRecordCorrect: (profileId: string, levelId: LevelId, firstTry: boolean, hintUsed: boolean) => void
  onFinishLesson: (profileId: string, levelId: LevelId, cleanSolved: number, lessonSize: number, durationMs: number) => void
}

type LessonStage = 'intro' | 'demo' | 'practice' | 'finish'

function getPromptHint(step: ColumnStep, operation: 'add' | 'subtract'): string {
  if (operation === 'add') {
    const carryNote = step.carryIn > 0 ? ` Не забудь прибавить ещё ${step.carryIn} перенесённую единицу.` : ''
    return `Сколько будет ${step.aDigit} + ${step.bDigit}?${carryNote} Если единиц получится больше девяти, одну цифру пишем, а десяток переносим.`
  }
  if (step.aDigit < step.bDigit) {
    return `Единиц пока не хватает. У какого ближайшего старшего разряда можно занять 1?${step.borrow && step.borrow.fromPlace > step.place + 1 ? ' Нули по пути превратятся в 9.' : ''}`
  }
  return `Вычти ${step.bDigit} из ${step.aDigit} в разряде ${step.placeName}. Начинаем справа налево.`
}

function getFirstInstruction(operation: 'add' | 'subtract'): string {
  return operation === 'add'
    ? 'Начинаем с единиц. Складываем цифры одного разряда; если сумма больше 9, младшую цифру пишем в ответ, а десяток переносим в следующий разряд.'
    : 'Начинаем с единиц. Если цифры не хватает, занимаем 1 у ближайшего старшего разряда. Если между ними нули, они становятся 9.'
}

function describeStep(step: ColumnStep, operation: 'add' | 'subtract'): string {
  if (step.isFinalCarry) return step.explanation
  return operation === 'add' ? step.explanation : step.explanation
}

export function LessonScreen({ profile, levelId, onExit, onRecordMistake, onRecordCorrect, onFinishLesson }: LessonScreenProps) {
  const level = getLevelInfo(levelId)
  const lessonSize = profile.settings.lessonSize
  const [stage, setStage] = useState<LessonStage>('intro')
  const [example, setExample] = useState(() => generateExample(levelId))
  const [demoIndex, setDemoIndex] = useState(-1)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [hintStage, setHintStage] = useState(0)
  const [hintUsed, setHintUsed] = useState(false)
  const [mistakes, setMistakes] = useState(0)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [coachMessage, setCoachMessage] = useState('Я рядом. Сначала единицы, потом десятки!')
  const [showHintAnswer, setShowHintAnswer] = useState(false)
  const [questionComplete, setQuestionComplete] = useState(false)
  const [interactionCount, setInteractionCount] = useState(0)
  const [cleanSolved, setCleanSolved] = useState(0)
  const [solvedCount, setSolvedCount] = useState(0)
  const startTime = useRef(Date.now())
  const finishGuard = useRef(false)

  const analysis = useMemo(() => analyzeColumn(example.a, example.b, example.operation), [example])
  const inputSteps = analysis.inputSteps
  const currentStep = inputSteps[stepIndex] ?? null
  const demoVisibleSteps = analysis.steps.slice(0, demoIndex + 1)
  const demoAnswers = Object.fromEntries(demoVisibleSteps.map((step) => [step.place, step.expectedDigit]))
  const practiceVisibleSteps = analysis.steps.filter((step) => (
    answers[step.place] !== undefined || (step.place === currentStep?.place && !!step.borrow)
  ))

  useEffect(() => {
    if (stage !== 'practice' || questionComplete || errorText || !currentStep) return
    const idleTimer = setTimeout(() => setCoachMessage('Понадобилась пауза? Нажми на лампочку, если хочешь подсказку.'), 20_000)
    return () => clearTimeout(idleTimer)
  }, [stage, questionComplete, errorText, currentStep, interactionCount])

  useEffect(() => {
    if (!profile.settings.keyboardEnabled || stage !== 'practice') return
    const handleKey = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) {
        event.preventDefault()
        attemptDigit(Number(event.key))
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        eraseLastDigit()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  const attemptDigit = (digit: number) => {
    if (stage !== 'practice' || questionComplete || errorText || !currentStep) return
    setInteractionCount((count) => count + 1)
    if (digit !== currentStep.expectedDigit) {
      setMistakes((count) => count + 1)
      onRecordMistake(profile.id, levelId)
      playFeedback('gentle-wrong', profile.settings.soundEnabled)
      vibrate(8, profile.settings.hapticsEnabled)
      setErrorText(`${currentStep.explanation} Правильная цифра — ${currentStep.expectedDigit}. Попробуй вписать её сам.`)
      setCoachMessage('Так бывает! Теперь мы знаем, какой шаг нужно проверить. Ты справишься 💛')
      return
    }

    const nextAnswers = { ...answers, [currentStep.place]: digit }
    setAnswers(nextAnswers)
    setHintStage(0)
    setShowHintAnswer(false)
    setErrorText(null)
    playFeedback('correct', profile.settings.soundEnabled)
    vibrate(12, profile.settings.hapticsEnabled)

    const isLastStep = stepIndex >= inputSteps.length - 1
    if (isLastStep) {
      const wasIndependent = mistakes === 0 && !hintUsed
      setQuestionComplete(true)
      setSolvedCount((count) => count + 1)
      setCleanSolved((count) => count + (wasIndependent ? 1 : 0))
      onRecordCorrect(profile.id, levelId, wasIndependent, hintUsed)
      setCoachMessage(wasIndependent ? 'Самостоятельно и верно! Здорово получилось 🎉' : 'Готово! Ты разобрался и довёл пример до конца. Так держать!')
    } else {
      setStepIndex((index) => index + 1)
      setCoachMessage('Верно! Теперь посмотрим на следующий разряд.')
    }
  }

  const eraseLastDigit = () => {
    if (stage !== 'practice' || questionComplete || errorText || stepIndex <= 0) return
    const previousStep = inputSteps[stepIndex - 1]
    if (!previousStep) return
    setAnswers((current) => {
      const next = { ...current }
      delete next[previousStep.place]
      return next
    })
    setStepIndex((index) => index - 1)
    setHintStage(0)
    setShowHintAnswer(false)
    setCoachMessage('Ничего страшного — можно проверить ещё раз.')
  }

  const askHint = () => {
    if (!currentStep || stage !== 'practice' || questionComplete || errorText) return
    setInteractionCount((count) => count + 1)
    if (profile.settings.hintsMode === 'off') {
      setCoachMessage('Подсказки сейчас выключены. Можно попросить взрослого включить их в настройках.')
      return
    }
    if (profile.settings.hintsMode === 'answer' || hintStage >= 1) {
      setHintStage(2)
      setHintUsed(true)
      setShowHintAnswer(true)
      setCoachMessage(`${currentStep.explanation} Правильная цифра — ${currentStep.expectedDigit}.`)
      return
    }
    setHintStage(1)
    setCoachMessage(getPromptHint(currentStep, example.operation))
  }

  const dismissError = () => {
    setErrorText(null)
    setInteractionCount((count) => count + 1)
  }

  const beginPractice = () => {
    setExample(generateExample(levelId))
    setQuestionNumber(1)
    setStepIndex(0)
    setAnswers({})
    setMistakes(0)
    setHintStage(0)
    setHintUsed(false)
    setQuestionComplete(false)
    setErrorText(null)
    setStage('practice')
    setCoachMessage('Решаем справа налево. Ты можешь попросить подсказку в любой момент.')
  }

  const continueFromQuestion = () => {
    if (questionNumber >= lessonSize) {
      if (!finishGuard.current) {
        finishGuard.current = true
        onFinishLesson(profile.id, levelId, cleanSolved, lessonSize, Date.now() - startTime.current)
        playFeedback('reward', profile.settings.soundEnabled)
        vibrate([16, 32, 18], profile.settings.hapticsEnabled)
      }
      setStage('finish')
      return
    }
    setQuestionNumber((number) => number + 1)
    setExample(generateExample(levelId))
    setStepIndex(0)
    setAnswers({})
    setMistakes(0)
    setHintStage(0)
    setHintUsed(false)
    setQuestionComplete(false)
    setErrorText(null)
    setShowHintAnswer(false)
    setCoachMessage('Новый пример — новый шанс потренироваться!')
  }

  const startDemo = () => {
    setDemoIndex(0)
    setStage('demo')
  }

  const nextDemoStep = () => {
    if (demoIndex < inputSteps.length - 1) {
      setDemoIndex((index) => index + 1)
      return
    }
    beginPractice()
  }

  const activePlace = stage === 'demo'
    ? inputSteps[demoIndex]?.place ?? null
    : stage === 'practice' && !questionComplete
      ? currentStep?.place ?? null
      : null
  const visibleSteps = stage === 'demo' ? demoVisibleSteps : practiceVisibleSteps

  return (
    <main className="lesson-page page-shell">
      <header className="lesson-header">
        <button className="icon-button lesson-back" type="button" aria-label="Выйти из урока" onClick={onExit}>←</button>
        <div className="lesson-header-title"><span className="lesson-level-tag">УРОВЕНЬ {levelId}</span><strong>{level.shortTitle}</strong></div>
        {stage === 'practice' ? <span className="lesson-progress-pill">{questionNumber} / {lessonSize}</span> : <span className="lesson-progress-pill">БУК рядом</span>}
      </header>

      {stage === 'intro' && (
        <section className="lesson-content lesson-intro" aria-labelledby="lesson-title">
          <div className="lesson-coach-card"><Owl size={68} accent={profile.rewards.accentColor} accessories={profile.rewards.accessoriesEquipped} /><div><strong>Привет, {profile.name}!</strong><p>Сначала БУК покажет один пример, а потом ты попробуешь сам.</p></div></div>
          <div className="lesson-title-block"><p className="eyebrow">СЕГОДНЯ ТРЕНИРУЕМ</p><h1 id="lesson-title">{level.title}</h1><p>{level.description}</p></div>
          <div className="column-stage-card">
            <ColumnDisplay analysis={analysis} />
            <div className="algorithm-note"><span className="algorithm-icon" aria-hidden="true">{example.operation === 'add' ? '＋' : '−'}</span><div><strong>{example.operation === 'add' ? 'Складываем по разрядам' : 'Вычитаем по разрядам'}</strong><p>{getFirstInstruction(example.operation)}</p></div></div>
          </div>
          <div className="lesson-footer-actions"><button className="primary-button" type="button" onClick={startDemo}>Показать первый шаг <span aria-hidden="true">→</span></button><span className="no-pressure-note">Без таймера. Можно остановиться в любой момент.</span></div>
        </section>
      )}

      {stage === 'demo' && (
        <section className="lesson-content lesson-demo" aria-labelledby="demo-title">
          <div className="demo-intro-line"><span className="demo-step-counter">ШАГ {demoIndex + 1} ИЗ {inputSteps.length}</span><span className="demo-direction">Считаем справа налево ←</span></div>
          <div className="column-stage-card demo-column-card">
            <ColumnDisplay analysis={analysis} answers={demoAnswers} activePlace={activePlace} visibleSteps={demoVisibleSteps} demo />
          </div>
          <div className="demo-explanation-card" aria-live="polite">
            <div className="coach-avatar-small"><Owl size={48} accent={profile.rewards.accentColor} accessories={profile.rewards.accessoriesEquipped} /></div>
            <div><p className="eyebrow">БУК ОБЪЯСНЯЕТ</p><h1 id="demo-title">{inputSteps[demoIndex]?.isFinalCarry ? 'Перенос в ответ' : `Разряд ${inputSteps[demoIndex]?.placeName ?? ''}`}</h1><p>{inputSteps[demoIndex] ? describeStep(inputSteps[demoIndex]!, example.operation) : 'Посмотри, как цифры выстраиваются по разрядам.'}</p></div>
          </div>
          <div className="lesson-footer-actions"><button className="primary-button" type="button" onClick={nextDemoStep}>{demoIndex < inputSteps.length - 1 ? 'Следующий шаг' : 'Начать тренировку'} <span aria-hidden="true">→</span></button><span className="no-pressure-note">Пример разбираем от единиц к старшим разрядам</span></div>
        </section>
      )}

      {stage === 'practice' && currentStep && (
        <section className="lesson-content lesson-practice" aria-labelledby="practice-title">
          <div className="practice-topline">
            <div><p className="eyebrow">ТРЕНИРОВКА</p><h1 id="practice-title">Пример {questionNumber} <span>из {lessonSize}</span></h1></div>
            <div className="question-dots" aria-label={`Пример ${questionNumber} из ${lessonSize}`}>{Array.from({ length: lessonSize }, (_, index) => <i className={index < questionNumber ? 'question-dot question-dot-active' : 'question-dot'} key={index} />)}</div>
          </div>
          <div className="coach-message-card" aria-live="polite">
            <Owl size={50} accent={profile.rewards.accentColor} accessories={profile.rewards.accessoriesEquipped} />
            <p>{errorText ?? coachMessage}</p>
          </div>
          <div className={`column-stage-card practice-column-card${errorText ? ' practice-column-error' : ''}`}>
            <ColumnDisplay analysis={analysis} answers={answers} activePlace={activePlace} visibleSteps={visibleSteps} />
            <p className="column-helper-text">{questionComplete ? 'Пример решён!' : `Теперь считаем разряд ${currentStep.placeName}`}</p>
          </div>

          {errorText ? (
            <div className="error-action-row"><span className="soft-correction"><span aria-hidden="true">💛</span> Ошибка — это подсказка, не беда.</span><button className="primary-button compact-button" type="button" onClick={dismissError}>Понятно, попробую ещё раз</button></div>
          ) : questionComplete ? (
            <div className="question-complete-card" role="status"><div className="complete-stars" aria-hidden="true">✦ ✦ ✦</div><strong>{mistakes === 0 && !hintUsed ? 'Отлично! Самостоятельно!' : 'Здорово, ты справился!'}</strong><p>Ошибки не отнимают награду — главное, что ты разобрался.</p><button className="primary-button" type="button" onClick={continueFromQuestion}>{questionNumber < lessonSize ? 'Следующий пример' : 'Завершить урок'} <span aria-hidden="true">→</span></button></div>
          ) : (
            <>
              <Keypad onDigit={attemptDigit} onErase={eraseLastDigit} disabled={false} eraseDisabled={stepIndex === 0} />
              <div className="lesson-help-row">
                <button className="hint-button" type="button" onClick={askHint} aria-label="Получить подсказку"><span aria-hidden="true">💡</span><span>Подсказка</span>{hintStage > 0 && hintStage < 2 && profile.settings.hintsMode === 'question' && <small>ещё раз — ответ</small>}</button>
                <div className="live-step-note">Шаг {stepIndex + 1} из {inputSteps.length} · единицы первыми</div>
              </div>
              {showHintAnswer && <div className="hint-answer-card" role="status"><div><strong>Правильная цифра: {currentStep.expectedDigit}</strong><p>{currentStep.explanation}</p></div><button className="hint-insert-button" type="button" onClick={() => attemptDigit(currentStep.expectedDigit)}>Вписать цифру</button></div>}
            </>
          )}
        </section>
      )}

      {stage === 'finish' && (
        <section className="lesson-finish-card panel-card" aria-labelledby="finish-title">
          <div className="finish-illustration"><Owl size={150} accent={profile.rewards.accentColor} accessories={profile.rewards.accessoriesEquipped} /><span className="finish-confetti confetti-one">✦</span><span className="finish-confetti confetti-two">✧</span></div>
          <p className="eyebrow">УРОК ЗАВЕРШЁН</p>
          <h1 id="finish-title">Ты отлично потрудился, {profile.name}!</h1>
          <p className="finish-description">Сегодня ты довёл до конца {solvedCount} {solvedCount === 1 ? 'пример' : 'примера'}. Можно возвращаться в любое время — БУК будет ждать.</p>
          <div className="finish-rewards"><span>💎 +5 кристаллов</span><span>🧩 +1 фрагмент костюма</span><span>⭐ +10 опыта</span></div>
          <button className="primary-button" type="button" onClick={onExit}>На главную <span aria-hidden="true">→</span></button>
        </section>
      )}
    </main>
  )
}
