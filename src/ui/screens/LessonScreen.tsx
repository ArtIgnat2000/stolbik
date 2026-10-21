import { useEffect, useMemo, useRef, useState } from 'react'
import { getLevelInfo, generateExample, type LevelId } from '../../content/levels'
import { analyzeColumn, type ColumnStep } from '../../engine/column'
import { playFeedback, vibrate } from '../../platform/feedback'
import type { ChildProfile } from '../../state/profile'
import { ColumnDisplay } from '../components/ColumnDisplay'
import { Keypad } from '../components/Keypad'
import { Owl } from '../components/Owl'
import { PlaceValueExplorer } from '../components/PlaceValueExplorer'
import { buildLessonMicroSteps } from './lessonSelfCheck'
import { plural, EXAMPLES } from '../plural'

interface LessonScreenProps {
  profile: ChildProfile
  levelId: LevelId
  onExit: () => void
  onRecordMistake: (profileId: string, levelId: LevelId) => void
  onRecordCorrect: (profileId: string, levelId: LevelId, firstTry: boolean, hintUsed: boolean) => void
  onFinishLesson: (profileId: string, levelId: LevelId, cleanSolved: number, lessonSize: number, durationMs: number) => void
}

type LessonStage = 'intro' | 'warmup' | 'model' | 'demo' | 'practice' | 'finish'
type ReflectionChoice = 'model' | 'help' | 'self-check'

const WARMUP_QUESTIONS = [
  {
    prompt: 'Точка — одна единица. Сколько точек в одном треугольнике?',
    options: ['1 (одна)', '10 (десять)', '100 (сто)'],
    correctIndex: 1,
    hint: 'Вспомни: десять точек объединяются в один треугольник-десяток.'
  },
  {
    prompt: 'Сколько десятков в одной сотне?',
    options: ['1 (один)', '10 (десять)', '100 (сто)'],
    correctIndex: 1,
    hint: 'Сотня — это десять десятков; в модели это десять треугольников.'
  }
] as const

const TEN_DOT_POSITIONS = [
  [60, 25],
  [48, 43], [72, 43],
  [36, 61], [60, 61], [84, 61],
  [24, 79], [48, 79], [72, 79], [96, 79]
] as const

const PLACE_LABELS = ['единицы', 'десятки', 'сотни', 'тысячи'] as const

function getPlaceLabel(place: number): string {
  return PLACE_LABELS[place] ?? 'разряд'
}

function getAnswerExplanation(step: ColumnStep, operation: 'add' | 'subtract'): string {
  if (step.isFinalCarry) return `Записываем цифру ${step.carryIn}.`
  if (operation === 'add') {
    const carry = step.carryIn > 0 ? ` + ${step.carryIn}` : ''
    return `${step.aDigit} + ${step.bDigit}${carry} = ${step.subtotal}.`
  }
  return `${step.aDigit} − ${step.bDigit} = ${step.expectedDigit}.`
}

function WarmupPlaceValueDiagram() {
  return (
    <div className="warmup-model-diagram" role="group" aria-label="Наглядная модель точки и треугольника">
      <figure className="warmup-model-figure">
        <svg className="warmup-unit-mark" viewBox="0 0 56 56" aria-hidden="true" focusable="false">
          <circle cx="28" cy="28" r="12" />
        </svg>
        <figcaption><strong>Точка</strong><span>1 единица</span></figcaption>
      </figure>
      <span className="warmup-model-question" aria-hidden="true">?</span>
      <figure className="warmup-model-figure warmup-model-figure-triangle">
        <svg className="warmup-ten-mark" viewBox="0 0 120 110" aria-hidden="true" focusable="false">
          <polygon points="60,7 7,100 113,100" />
          {TEN_DOT_POSITIONS.map(([cx, cy], index) => <circle cx={cx} cy={cy} r="5" key={index} />)}
        </svg>
        <figcaption><strong>Треугольник</strong><span>Посчитай точки внутри</span><span className="visually-hidden">Точки расположены рядами: 1, 2, 3 и 4.</span></figcaption>
      </figure>
    </div>
  )
}

function getPromptHint(step: ColumnStep, operation: 'add' | 'subtract'): string {
  if (step.isFinalCarry) return `Запиши ${step.carryIn} в ${step.placeName}.`
  if (operation === 'add') {
    const carry = step.carryIn > 0 ? ` + ${step.carryIn}` : ''
    return `Посчитай ${step.aDigit} + ${step.bDigit}${carry}.`
  }
  if (step.borrow) {
    const fromPlace = step.borrow.fromPlace
    const from = fromPlace === 2 ? 'сотня' : fromPlace === 1 ? 'десяток' : 'тысяча'
    const targetPlace = fromPlace - 1
    const target = targetPlace === 0 ? 'единиц' : targetPlace === 1 ? 'десятков' : 'сотен'
    return `Обмен: 1 ${from} → 10 ${target}.`
  }
  return `Посчитай ${step.aDigit} − ${step.bDigit}.`
}

export function LessonScreen({ profile, levelId, onExit, onRecordMistake, onRecordCorrect, onFinishLesson }: LessonScreenProps) {
  const level = getLevelInfo(levelId)
  const lessonSize = profile.settings.lessonSize
  const [stage, setStage] = useState<LessonStage>('intro')
  const [example, setExample] = useState(() => generateExample(levelId))
  const [warmupIndex, setWarmupIndex] = useState(0)
  const [warmupMessage, setWarmupMessage] = useState('')
  const [demoIndex, setDemoIndex] = useState(-1)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [stepIndex, setStepIndex] = useState(0)
  const [selfCheckIndex, setSelfCheckIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [hintStage, setHintStage] = useState(0)
  const [hintUsed, setHintUsed] = useState(false)
  const [mistakes, setMistakes] = useState(0)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [coachMessage, setCoachMessage] = useState('Сначала единицы, потом десятки.')
  const [showHintAnswer, setShowHintAnswer] = useState(false)
  const [questionComplete, setQuestionComplete] = useState(false)
  const [reflectionChoice, setReflectionChoice] = useState<ReflectionChoice | null>(null)
  const [interactionCount, setInteractionCount] = useState(0)
  const [cleanSolved, setCleanSolved] = useState(0)
  const [solvedCount, setSolvedCount] = useState(0)
  const startTime = useRef(Date.now())
  const finishGuard = useRef(false)

  const analysis = useMemo(() => analyzeColumn(example.a, example.b, example.operation), [example])
  const lessonSteps = useMemo(() => buildLessonMicroSteps(analysis), [analysis])
  const inputSteps = analysis.inputSteps
  const currentStep = inputSteps[stepIndex] ?? null
  const demoStep = lessonSteps[demoIndex] ?? null
  const selfCheckStep = lessonSteps[selfCheckIndex] ?? null
  const seenDemoWrites = lessonSteps.slice(0, demoIndex + 1).filter((step) => step.kind === 'write' && step.digit !== undefined)
  const demoAnswers = Object.fromEntries(seenDemoWrites.map((step) => [step.place, step.digit!]))
  const demoWrittenPlaces = new Set(seenDemoWrites.map((step) => step.place))
  const demoVisiblePlaces = new Set(analysis.steps.filter((step) => {
    if (!demoWrittenPlaces.has(step.place)) return false
    if (step.carryOut <= 0) return true
    const carryStepIndex = lessonSteps.findIndex((item) => item.kind === 'carry' && item.fromPlace === step.place)
    if (carryStepIndex >= 0) return carryStepIndex <= demoIndex
    const finalCarry = analysis.inputSteps.find((candidate) => candidate.isFinalCarry && candidate.place === step.place + 1)
    if (!finalCarry) return true
    const finalCarryIndex = lessonSteps.findIndex((item) => item.kind === 'write' && item.place === finalCarry.place && item.digit === finalCarry.expectedDigit)
    return finalCarryIndex >= 0 && finalCarryIndex <= demoIndex
  }).map((step) => step.place))
  const demoVisibleSteps = analysis.steps.filter((step) => demoVisiblePlaces.has(step.place))
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
      setErrorText(getPromptHint(currentStep, example.operation))
      setCoachMessage('Ничего страшного. Попробуй ещё раз.')
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
      setSelfCheckIndex(0)
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
      setCoachMessage('Посмотри на подсказку с ответом.')
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
    setSelfCheckIndex(0)
    setErrorText(null)
    setStage('practice')
    setCoachMessage('Не спеши. Я рядом.')
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
    setSelfCheckIndex(0)
    setErrorText(null)
    setShowHintAnswer(false)
    setCoachMessage('Новый пример. Не спеши.')
  }

  const startModel = () => {
    setWarmupIndex(0)
    setWarmupMessage('')
    setStage('warmup')
  }

  const answerWarmup = (optionIndex: number) => {
    const question = WARMUP_QUESTIONS[warmupIndex]
    if (!question) return
    if (optionIndex !== question.correctIndex) {
      setWarmupMessage(question.hint)
      return
    }
    setWarmupMessage('Верно. Теперь применим эту модель к примеру.')
    if (warmupIndex === WARMUP_QUESTIONS.length - 1) {
      setStage('model')
    } else {
      setWarmupIndex((index) => index + 1)
    }
  }

  const finishModel = () => {
    setDemoIndex(0)
    setStage('demo')
  }

  const nextDemoStep = () => {
    if (demoIndex < lessonSteps.length - 1) {
      setDemoIndex((index) => index + 1)
      return
    }
    beginPractice()
  }

  const advanceSelfCheck = () => {
    if (selfCheckIndex < lessonSteps.length - 1) {
      setSelfCheckIndex((index) => index + 1)
      return
    }
    continueFromQuestion()
  }

  const activePlace = stage === 'demo'
    ? demoStep?.kind === 'exchange' ? demoStep.toPlace ?? demoStep.place : demoStep?.place ?? null
    : stage === 'practice' && questionComplete
      ? selfCheckStep?.kind === 'exchange' ? selfCheckStep.toPlace ?? selfCheckStep.place : selfCheckStep?.place ?? null
      : stage === 'practice'
        ? currentStep?.place ?? null
        : null
  const visibleSteps = stage === 'demo' ? demoVisibleSteps : practiceVisibleSteps

  return (
    <main className="lesson-page page-shell">
      <header className={stage === 'practice' ? 'lesson-header lesson-header-practice' : 'lesson-header'}>
        <button className="icon-button lesson-back" type="button" aria-label="Выйти из урока" onClick={onExit}>←</button>
        <div className="lesson-header-title"><span className="lesson-level-tag">УРОВЕНЬ {levelId}</span><strong>{stage === 'practice' ? 'Тренировка' : level.shortTitle}</strong></div>
        {stage !== 'practice' && <span className="lesson-progress-pill">{stage === 'warmup' ? 'Повторяем' : stage === 'model' ? 'Модель' : stage === 'demo' ? 'Разбор' : 'БУК рядом'}</span>}
      </header>

      {stage === 'intro' && (
        <section className="lesson-content lesson-intro" aria-labelledby="lesson-title">
          <div className="lesson-coach-card"><Owl size={68} accent={profile.rewards.accentColor} accessories={profile.rewards.accessoriesEquipped} /><div><strong>Привет, {profile.name}!</strong><p>Сначала вспомним нужный способ. Потом разберём пример и потренируемся.</p></div></div>
          <div className="lesson-title-block"><p className="eyebrow">СЕГОДНЯ УЗНАЕМ</p><h1 id="lesson-title">{level.title}</h1><p>{level.description}</p></div>
          <div className="column-stage-card">
            <ColumnDisplay analysis={analysis} />
          </div>
          <div className="lesson-footer-actions"><button className="primary-button" type="button" onClick={startModel}>Начать урок <span aria-hidden="true">→</span></button><span className="no-pressure-note">Без таймера и штрафов. Можно остановиться в любой момент.</span></div>
        </section>
      )}

      {stage === 'warmup' && (
        <section className="lesson-content warmup-screen" aria-labelledby="warmup-title">
          <div className="warmup-card">
            <p className="eyebrow">ВОСПОМИНАЕМ ИЗВЕСТНОЕ · ШАГ {warmupIndex + 1} ИЗ {WARMUP_QUESTIONS.length}</p>
            <h1 id="warmup-title">{WARMUP_QUESTIONS[warmupIndex]?.prompt}</h1>
            <p className="warmup-intro">Это не контрольная. Подумай спокойно — можно попробовать ещё раз.</p>
            {warmupIndex === 0 && <WarmupPlaceValueDiagram />}
            <div className="warmup-options">
              {WARMUP_QUESTIONS[warmupIndex]?.options.map((option, index) => <button className="warmup-option" type="button" key={option} onClick={() => answerWarmup(index)}>{option}</button>)}
            </div>
            <p className="warmup-feedback" role="status" aria-live="polite">{warmupMessage || 'Выбери ответ, который подходит к модели.'}</p>
          </div>
        </section>
      )}

      {stage === 'model' && (
        <section className="lesson-content lesson-model" aria-label="Исследование модели">
          <PlaceValueExplorer a={example.a} b={example.b} operation={example.operation} onComplete={finishModel} />
        </section>
      )}

      {stage === 'demo' && demoStep && (
        <section className="lesson-content lesson-demo" aria-labelledby="demo-title">
          <div className="demo-intro-line"><span className="demo-step-counter">ШАГ {demoIndex + 1} ИЗ {lessonSteps.length}</span><span className="demo-direction">Пример: {example.a} {example.operation === 'add' ? '+' : '−'} {example.b}</span></div>
          <div className="column-stage-card demo-column-card">
            <ColumnDisplay analysis={analysis} answers={demoAnswers} activePlace={activePlace} visibleSteps={demoVisibleSteps} demo />
          </div>
          <div className="demo-explanation-card" aria-live="polite">
            <div className="coach-avatar-small"><Owl size={48} accent={profile.rewards.accentColor} accessories={profile.rewards.accessoriesEquipped} /></div>
            <div><p className="eyebrow">ОДИН ШАГ</p><h1 id="demo-title">{demoStep.title}</h1><p>{demoStep.text}</p></div>
          </div>
          <div className="lesson-footer-actions"><button className="primary-button" type="button" onClick={nextDemoStep}>{demoIndex < lessonSteps.length - 1 ? 'Следующий шаг' : 'Начать тренировку'} <span aria-hidden="true">→</span></button></div>
        </section>
      )}

      {stage === 'practice' && currentStep && (
        <section className="lesson-content lesson-practice" aria-labelledby="practice-title">
          <div className="practice-topline">
            <div><p className="eyebrow">ТРЕНИРОВКА</p><h1 id="practice-title">Пример {questionNumber} <span>из {lessonSize}</span></h1></div>
            <div className="question-dots" aria-hidden="true">{Array.from({ length: lessonSize }, (_, index) => <i className={index < questionNumber ? 'question-dot question-dot-active' : 'question-dot'} key={index} />)}</div>
          </div>
          {questionComplete ? (
            <p className="visually-hidden" role="status" aria-live="polite">Пример решён. Сверяем ответ по одному шагу.</p>
          ) : (
            <div className="coach-message-card" aria-live="polite">
              <Owl size={50} accent={profile.rewards.accentColor} accessories={profile.rewards.accessoriesEquipped} />
              <p>{errorText ?? coachMessage}</p>
            </div>
          )}
          <div className={`column-stage-card practice-column-card${errorText ? ' practice-column-error' : ''}`}>
            <ColumnDisplay analysis={analysis} answers={answers} activePlace={activePlace} visibleSteps={visibleSteps} />
            {!questionComplete && !errorText && <p className="column-helper-text">Сейчас считаем: {getPlaceLabel(currentStep.place)}.</p>}
          </div>

          {errorText ? (
            <div className="error-action-row"><span className="soft-correction"><span aria-hidden="true">💛</span> Ничего страшного.</span><button className="primary-button compact-button" type="button" onClick={dismissError}>Попробовать ещё раз</button></div>
          ) : questionComplete ? (
            <section className="question-complete-card" aria-labelledby="question-complete-title">
              <div className="complete-stars" aria-hidden="true">✦ ✦ ✦</div>
              <h2 id="question-complete-title">{mistakes === 0 && !hintUsed ? 'Самостоятельно!' : 'Ты справился!'}</h2>
              <p>Проверим ответ по одному шагу.</p>
              {selfCheckStep && (
                <div className="self-check-step-card" aria-live="polite" data-testid="self-check-step">
                  <span className="self-check-step-progress">ШАГ {selfCheckIndex + 1} ИЗ {lessonSteps.length}</span>
                  <strong>{selfCheckStep.title}</strong>
                  <p>{selfCheckStep.text}</p>
                </div>
              )}
              <button className="primary-button" type="button" onClick={advanceSelfCheck}>
                {selfCheckIndex < lessonSteps.length - 1 ? 'Следующий шаг' : questionNumber < lessonSize ? 'Следующий пример' : 'Завершить урок'} <span aria-hidden="true">→</span>
              </button>
            </section>
          ) : (
            <>
              <Keypad onDigit={attemptDigit} onErase={eraseLastDigit} disabled={false} eraseDisabled={stepIndex === 0} />
              <div className="lesson-help-row">
                <button className="hint-button" type="button" onClick={askHint} aria-label="Получить подсказку"><span aria-hidden="true">💡</span><span>Подсказка</span>{hintStage > 0 && hintStage < 2 && profile.settings.hintsMode === 'question' && <small>ещё раз — ответ</small>}</button>
                <div className="live-step-note">Шаг {stepIndex + 1} из {inputSteps.length}</div>
              </div>
              {showHintAnswer && <div className="hint-answer-card" role="status"><div><strong>Правильная цифра: {currentStep.expectedDigit}</strong><p>{getAnswerExplanation(currentStep, example.operation)}</p></div><button className="hint-insert-button" type="button" onClick={() => attemptDigit(currentStep.expectedDigit)}>Вписать цифру</button></div>}
            </>
          )}
        </section>
      )}

      {stage === 'finish' && (
        <section className="lesson-finish-card panel-card" aria-labelledby="finish-title">
          <div className="finish-illustration"><Owl size={150} accent={profile.rewards.accentColor} accessories={profile.rewards.accessoriesEquipped} /><span className="finish-confetti confetti-one">✦</span><span className="finish-confetti confetti-two">✧</span></div>
          <p className="eyebrow">УРОК ЗАВЕРШЁН</p>
          <h1 id="finish-title">Ты отлично потрудился, {profile.name}!</h1>
          <p className="finish-description">Сегодня ты довёл до конца {plural(solvedCount, EXAMPLES)}. Можно возвращаться в любое время — БУК будет ждать.</p>
          <div className="reflection-panel" role="group" aria-labelledby="reflection-title">
            <strong id="reflection-title">Что помогло тебе сегодня?</strong>
            <div className="reflection-options">
              <button className={reflectionChoice === 'model' ? 'reflection-option reflection-option-selected' : 'reflection-option'} type="button" aria-pressed={reflectionChoice === 'model'} onClick={() => setReflectionChoice('model')}>Фишки</button>
              <button className={reflectionChoice === 'help' ? 'reflection-option reflection-option-selected' : 'reflection-option'} type="button" aria-pressed={reflectionChoice === 'help'} onClick={() => setReflectionChoice('help')}>Подсказка БУКа</button>
              <button className={reflectionChoice === 'self-check' ? 'reflection-option reflection-option-selected' : 'reflection-option'} type="button" aria-pressed={reflectionChoice === 'self-check'} onClick={() => setReflectionChoice('self-check')}>Проверка ответа</button>
            </div>
            {reflectionChoice && <p className="reflection-feedback" role="status">Спасибо, что заметил, какой способ помог.</p>}
          </div>
          <div className="finish-rewards"><span>💎 +5 кристаллов</span><span>🧩 +1 фрагмент костюма</span><span>⭐ +10 опыта</span></div>
          <button className="primary-button" type="button" onClick={onExit}>На главную <span aria-hidden="true">→</span></button>
        </section>
      )}
    </main>
  )
}
