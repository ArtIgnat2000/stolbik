import { useEffect, useMemo, useRef, useState } from 'react'
import { getLevelInfo, generateExample, type LevelId } from '../../content/levels'
import { analyzeColumn, type ColumnStep } from '../../engine/column'
import { playFeedback, vibrate } from '../../platform/feedback'
import type { ChildProfile } from '../../state/profile'
import { ColumnDisplay } from '../components/ColumnDisplay'
import { Keypad } from '../components/Keypad'
import { Owl } from '../components/Owl'
import { PlaceValueExplorer } from '../components/PlaceValueExplorer'
import { TEN_DOT_POSITIONS } from '../components/placeValueMarks'
import { getSelfCheckStepText, getSelfCheckStepTitle } from './lessonSelfCheck'
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
  if (step.isFinalCarry) return `Перенесённую единицу запиши в разряд ${step.placeName}.`
  if (operation === 'add') {
    const carryNote = step.carryIn > 0 ? ' Не забудь прибавить ещё одну перенесённую единицу.' : ''
    return `Сколько будет ${step.aDigit} + ${step.bDigit}?${carryNote} Если единиц получится больше девяти, подумай, как сгруппировать их по разрядам.`
  }
  if (step.borrow) {
    const zeroNote = step.borrow.fromPlace > step.place + 1 ? ' При размене каждый промежуточный ноль станет 9 в своём разряде.' : ''
    return `В разряде ${step.placeName} пока ${step.originalADigit}, а нужно вычесть ${step.bDigit}. Какой ближайший старший разряд можно разменять?${zeroNote}`
  }
  return `Вычти ${step.bDigit} из ${step.aDigit} в разряде ${step.placeName}. Начинаем справа налево.`
}

function getFirstInstruction(operation: 'add' | 'subtract'): string {
  return operation === 'add'
    ? 'Сначала рассмотри единицы и десятки отдельно. Сколько единиц получится и можно ли все оставить в этом разряде?'
    : 'Сначала рассмотри единицы. Хватит ли их, чтобы выполнить вычитание? Если нет, подумай, какой разряд может помочь.'
}

function describeStep(step: ColumnStep): string {
  return step.explanation
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
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [hintStage, setHintStage] = useState(0)
  const [hintUsed, setHintUsed] = useState(false)
  const [mistakes, setMistakes] = useState(0)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [coachMessage, setCoachMessage] = useState('Я рядом. Сначала единицы, потом десятки!')
  const [showHintAnswer, setShowHintAnswer] = useState(false)
  const [questionComplete, setQuestionComplete] = useState(false)
  const [selfCheckAck, setSelfCheckAck] = useState(false)
  const [reflectionChoice, setReflectionChoice] = useState<ReflectionChoice | null>(null)
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
      setErrorText(`${getPromptHint(currentStep, example.operation)} Проверь разрядную модель или попроси подсказку — правильный ответ не теряется.`)
      setCoachMessage('Так бывает! Ошибка помогает заметить, что стоит проверить. Ты справишься 💛')
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
      setSelfCheckAck(false)
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
    setSelfCheckAck(false)
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
    setSelfCheckAck(false)
    setErrorText(null)
    setShowHintAnswer(false)
    setCoachMessage('Новый пример — новый шанс потренироваться!')
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
      <header className={stage === 'practice' ? 'lesson-header lesson-header-practice' : 'lesson-header'}>
        <button className="icon-button lesson-back" type="button" aria-label="Выйти из урока" onClick={onExit}>←</button>
        <div className="lesson-header-title"><span className="lesson-level-tag">УРОВЕНЬ {levelId}</span><strong>{stage === 'practice' ? 'Тренировка' : level.shortTitle}</strong></div>
        {stage !== 'practice' && <span className="lesson-progress-pill">{stage === 'warmup' ? 'Повторяем' : stage === 'model' ? 'Модель' : stage === 'demo' ? 'Разбор' : 'БУК рядом'}</span>}
      </header>

      {stage === 'intro' && (
        <section className="lesson-content lesson-intro" aria-labelledby="lesson-title">
          <div className="lesson-coach-card"><Owl size={68} accent={profile.rewards.accentColor} accessories={profile.rewards.accessoriesEquipped} /><div><strong>Привет, {profile.name}!</strong><p>Сегодня ты сначала попробуешь сам найти способ. БУК поможет построить модель и сверить открытие.</p></div></div>
          <div className="lesson-title-block"><p className="eyebrow">ИССЛЕДУЕМ И ПРОВЕРЯЕМ</p><h1 id="lesson-title">{level.title}</h1><p>{level.description}</p></div>
          <div className="column-stage-card">
            <ColumnDisplay analysis={analysis} />
            <div className="algorithm-note"><span className="algorithm-icon" aria-hidden="true">{example.operation === 'add' ? '＋' : '−'}</span><div><strong>Пробное задание</strong><p>{getFirstInstruction(example.operation)}</p></div></div>
          </div>
          <div className="lesson-footer-actions"><button className="primary-button" type="button" onClick={startModel}>Попробовать и исследовать <span aria-hidden="true">→</span></button><span className="no-pressure-note">Без таймера и штрафов. Можно остановиться в любой момент.</span></div>
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

      {stage === 'demo' && (
        <section className="lesson-content lesson-demo" aria-labelledby="demo-title">
          <div className="demo-intro-line"><span className="demo-step-counter">ШАГ {demoIndex + 1} ИЗ {inputSteps.length}</span><span className="demo-direction">Считаем справа налево ←</span></div>
          <div className="column-stage-card demo-column-card">
            <ColumnDisplay analysis={analysis} answers={demoAnswers} activePlace={activePlace} visibleSteps={demoVisibleSteps} demo />
          </div>
          <div className="demo-explanation-card" aria-live="polite">
            <div className="coach-avatar-small"><Owl size={48} accent={profile.rewards.accentColor} accessories={profile.rewards.accessoriesEquipped} /></div>
            <div><p className="eyebrow">ФИКСИРУЕМ НАЙДЕННЫЙ СПОСОБ</p><h1 id="demo-title">{inputSteps[demoIndex]?.isFinalCarry ? 'Записываем перенос' : `Разряд ${inputSteps[demoIndex]?.placeName ?? ''}`}</h1><p>{inputSteps[demoIndex] ? describeStep(inputSteps[demoIndex]!) : 'Сопоставь модель с записью по разрядам.'}</p></div>
          </div>
          <div className="lesson-footer-actions"><button className="primary-button" type="button" onClick={nextDemoStep}>{demoIndex < inputSteps.length - 1 ? 'Следующий шаг' : 'Начать тренировку'} <span aria-hidden="true">→</span></button><span className="no-pressure-note">Пример разбираем от единиц к старшим разрядам</span></div>
        </section>
      )}

      {stage === 'practice' && currentStep && (
        <section className="lesson-content lesson-practice" aria-labelledby="practice-title">
          <div className="practice-topline">
            <div><p className="eyebrow">ТРЕНИРОВКА</p><h1 id="practice-title">Пример {questionNumber} <span>из {lessonSize}</span></h1></div>
            <div className="question-dots" aria-hidden="true">{Array.from({ length: lessonSize }, (_, index) => <i className={index < questionNumber ? 'question-dot question-dot-active' : 'question-dot'} key={index} />)}</div>
          </div>
          {questionComplete ? (
            <p className="visually-hidden" role="status" aria-live="polite">Пример решён. Сверь шаги решения ниже.</p>
          ) : (
            <div className="coach-message-card" aria-live="polite">
              <Owl size={50} accent={profile.rewards.accentColor} accessories={profile.rewards.accessoriesEquipped} />
              <p>{errorText ?? coachMessage}</p>
            </div>
          )}
          <div className={`column-stage-card practice-column-card${errorText ? ' practice-column-error' : ''}`}>
            <ColumnDisplay analysis={analysis} answers={answers} activePlace={activePlace} visibleSteps={visibleSteps} />
            {!questionComplete && <p className="column-helper-text">Считай разряд {currentStep.placeName}.</p>}
          </div>

          {errorText ? (
            <div className="error-action-row"><span className="soft-correction"><span aria-hidden="true">💛</span> Ошибка — это подсказка, не беда.</span><button className="primary-button compact-button" type="button" onClick={dismissError}>Понятно, попробую ещё раз</button></div>
          ) : questionComplete ? (
            <section className="question-complete-card" aria-labelledby="question-complete-title">
              <div className="complete-stars" aria-hidden="true">✦ ✦ ✦</div>
              <h2 id="question-complete-title">{mistakes === 0 && !hintUsed ? 'Самостоятельно!' : 'Ты справился!'}</h2>
              <p>Сверь шаги по разрядам. Ошибка — повод спокойно разобраться.</p>
              <ol className="self-check-list" aria-label="Самопроверка по разрядам">
                {analysis.steps.map((step) => (
                  <li key={step.place}>
                    <span className="self-check-step-title">{getSelfCheckStepTitle(step)}</span>
                    <span className="self-check-step-detail">{getSelfCheckStepText(step, example.operation)}</span>
                  </li>
                ))}
              </ol>
              <button className="secondary-button self-check-button" type="button" onClick={() => setSelfCheckAck(true)} aria-pressed={selfCheckAck}>{selfCheckAck ? 'Шаги сверены ✓' : 'Я сверил каждый шаг'}</button>
              <button className="primary-button" type="button" onClick={continueFromQuestion} disabled={!selfCheckAck}>{questionNumber < lessonSize ? 'Следующий пример' : 'Завершить урок'} <span aria-hidden="true">→</span></button>
            </section>
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
          <p className="finish-description">Сегодня ты довёл до конца {plural(solvedCount, EXAMPLES)}. Можно возвращаться в любое время — БУК будет ждать.</p>
          <div className="reflection-panel" role="group" aria-labelledby="reflection-title">
            <strong id="reflection-title">Что помогло тебе сегодня?</strong>
            <div className="reflection-options">
              <button className={reflectionChoice === 'model' ? 'reflection-option reflection-option-selected' : 'reflection-option'} type="button" aria-pressed={reflectionChoice === 'model'} onClick={() => setReflectionChoice('model')}>Модель разрядов</button>
              <button className={reflectionChoice === 'help' ? 'reflection-option reflection-option-selected' : 'reflection-option'} type="button" aria-pressed={reflectionChoice === 'help'} onClick={() => setReflectionChoice('help')}>Подсказка БУКа</button>
              <button className={reflectionChoice === 'self-check' ? 'reflection-option reflection-option-selected' : 'reflection-option'} type="button" aria-pressed={reflectionChoice === 'self-check'} onClick={() => setReflectionChoice('self-check')}>Самопроверка</button>
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
