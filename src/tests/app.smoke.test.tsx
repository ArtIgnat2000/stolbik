import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetLocalDatabaseForTests } from '../platform/database'
import { useAppStore } from '../state/store'
import { buildPlaceValueActions } from '../engine/placeValue'
import { App } from '../ui/App'

beforeEach(async () => {
  await resetLocalDatabaseForTests()
  useAppStore.setState({ profiles: [], activeProfileId: null, isReady: false, isLoading: false, storageWarning: null })
})

async function solveCurrentExample(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const a = Number(screen.getByTestId('operand-a').textContent)
  const b = Number(screen.getByTestId('operand-b').textContent)
  const operation = screen.getByTestId('operation').textContent
  const result = operation === 'add' ? a + b : a - b
  for (const digit of String(result).split('').reverse()) {
    await user.click(screen.getByRole('button', { name: `Цифра ${digit}` }))
  }
}

async function completeCurrentModel(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const a = Number(screen.getByText(/Первое число:/).textContent?.match(/\d+/)?.[0])
  const b = Number(screen.getByText(/Второе число:/).textContent?.match(/\d+/)?.[0])
  const operationText = screen.getByTestId('model-operation').textContent
  const actions = buildPlaceValueActions(a, b, operationText === '+' ? 'add' : 'subtract')
  for (const action of actions) {
    if (action.kind === 'combine') {
      await user.click(screen.getByRole('button', { name: new RegExp(`^${action.total}$`) }))
    } else if (action.kind === 'regroup' || action.kind === 'exchange') {
      await user.click(screen.getByTestId('model-correct-choice'))
    } else {
      await user.click(screen.getByRole('button', { name: new RegExp(`^${action.remaining}$`) }))
    }
  }
}

describe('первый запуск и короткий урок', () => {
  it('создаёт профиль, проходит урок и выдаёт награду без ошибок рендера', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Привет, будущий математик!' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Имя ребёнка'), 'Аня')
    await user.click(screen.getByRole('button', { name: /Начать заниматься/ }))

    expect(await screen.findByRole('heading', { name: 'Считаем шаг за шагом' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Начать 1:/ }))
    await user.click(await screen.findByRole('button', { name: /Попробовать и исследовать/ }))
    await user.click(screen.getByRole('button', { name: 'Десять единиц' }))
    await user.click(screen.getByRole('button', { name: '10 десятков' }))
    await completeCurrentModel(user)
    await user.click(screen.getByRole('button', { name: /Перейти к записи в столбик/ }))
    await user.click(screen.getByRole('button', { name: /Следующий шаг/ }))
    await user.click(screen.getByRole('button', { name: /Начать тренировку/ }))

    for (let question = 1; question <= 5; question += 1) {
      await solveCurrentExample(user)
      await user.click(await screen.findByRole('button', { name: /Я сверил каждый шаг/ }))
      const actionName = question === 5 ? /Завершить урок/ : /Следующий пример/
      await user.click(await screen.findByRole('button', { name: actionName }))
    }

    expect(await screen.findByRole('heading', { name: /Ты отлично потрудился, Аня!/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /На главную/ }))
    expect(await screen.findByRole('button', { name: /Кристаллов: 6/ })).toBeInTheDocument()

    const profile = useAppStore.getState().profiles[0]
    expect(profile?.progress.totalSolved).toBe(5)
    expect(profile?.progress.totalErrors).toBe(0)
    expect(profile?.progress.levels['1']?.crowns).toBe(3)
    await waitFor(() => expect(consoleError).not.toHaveBeenCalled())
    consoleError.mockRestore()
  })
})
