import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildPlaceValueActions } from '../../engine/placeValue'
import { createProfile } from '../../state/profile'
import { LessonScreen } from './LessonScreen'

vi.mock('../../content/levels', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../content/levels')>()
  return {
    ...actual,
    generateExample: vi.fn(() => ({ a: 58, b: 27, operation: 'add' as const, levelId: 5 as const }))
  }
})

function makeProfile() {
  const profile = createProfile('Аня')
  profile.settings.lessonSize = 3
  profile.settings.soundEnabled = false
  profile.settings.hapticsEnabled = false
  return profile
}

async function completeModel(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const actions = buildPlaceValueActions(58, 27, 'add')
  for (const action of actions) {
    if (action.kind === 'combine' || action.kind === 'remove') {
      await user.click(screen.getByTestId('model-correct-choice'))
    } else {
      await user.click(screen.getByTestId('model-exchange-action'))
    }
    await user.click(screen.getByRole('button', { name: /^Дальше/ }))
  }
}

describe('пошаговый показ переноса в уроке', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('показывает перенос отдельной карточкой и только после неё — над разрядом', async () => {
    const user = userEvent.setup()
    const profile = makeProfile()
    render(
      <LessonScreen
        profile={profile}
        levelId={5}
        onExit={vi.fn()}
        onRecordMistake={vi.fn()}
        onRecordCorrect={vi.fn()}
        onFinishLesson={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: /Начать урок/ }))
    await user.click(screen.getByRole('button', { name: '10 (десять)' }))
    await user.click(screen.getByRole('button', { name: '10 (десять)' }))
    await completeModel(user)
    await user.click(screen.getByRole('button', { name: /Перейти к записи в столбик/ }))

    const display = screen.getByTestId('column-display')
    expect(screen.getByRole('heading', { name: 'Считаем единицы' })).toBeInTheDocument()
    expect(display.querySelector('.annotation-carry')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Следующий шаг/ }))
    expect(screen.getByRole('heading', { name: 'Собираем десяток' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Следующий шаг/ }))
    expect(screen.getByRole('heading', { name: 'Записываем единицы' })).toBeInTheDocument()
    expect(display.querySelectorAll('.answer-cell-filled')).toHaveLength(1)
    expect(display.querySelector('.annotation-carry')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Следующий шаг/ }))
    expect(screen.getByRole('heading', { name: 'Переносим десяток' })).toBeInTheDocument()
    expect(screen.getByText('Перенос: 1 десяток → в разряд десятков.')).toBeInTheDocument()
    expect(display.querySelector('.annotation-carry')).toHaveTextContent('1')

    await user.click(screen.getByRole('button', { name: /Следующий шаг/ }))
    await user.click(screen.getByRole('button', { name: /Следующий шаг/ }))
    await user.click(screen.getByRole('button', { name: /Начать тренировку/ }))
    await user.click(screen.getByRole('button', { name: 'Цифра 5' }))
    await user.click(screen.getByRole('button', { name: 'Цифра 8' }))

    const selfCheck = await screen.findByTestId('self-check-step')
    expect(selfCheck).toHaveTextContent('ШАГ 1 ИЗ 6')
    for (let step = 0; step < 3; step += 1) {
      await user.click(screen.getByRole('button', { name: /Следующий шаг/ }))
    }
    expect(selfCheck).toHaveTextContent('Переносим десяток')
    expect(selfCheck).toHaveTextContent('Перенос: 1 десяток → в разряд десятков.')
  })
})
