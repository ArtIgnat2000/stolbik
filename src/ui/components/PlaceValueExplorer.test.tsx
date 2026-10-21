import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { buildPlaceValueActions, type PlaceValueAction } from '../../engine/placeValue'
import { PlaceValueExplorer } from './PlaceValueExplorer'

async function completeAction(user: ReturnType<typeof userEvent.setup>, action: PlaceValueAction): Promise<void> {
  if (action.kind === 'combine' || action.kind === 'remove') {
    await user.click(screen.getByTestId('model-correct-choice'))
  } else {
    await user.click(screen.getByTestId('model-exchange-action'))
  }
  await user.click(screen.getByRole('button', { name: /^Дальше/ }))
}

describe('короткие шаги модели разрядов', () => {
  it('оставляет один обмен на карточке и ждёт команды «Дальше»', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    const actions = buildPlaceValueActions(300, 156, 'subtract')
    render(<PlaceValueExplorer a={300} b={156} operation="subtract" onComplete={onComplete} />)

    expect(screen.getByRole('heading', { name: 'Вычитаем' })).toBeInTheDocument()
    expect(screen.getByText('Обмен: 1 сотня → 10 десятков.')).toBeInTheDocument()
    expect(screen.queryByText(/Первое число|Второе число|точка —/i)).not.toBeInTheDocument()
    expect(screen.getByText('ШАГ 1 ИЗ 5')).toBeInTheDocument()

    await user.click(screen.getByTestId('model-exchange-action'))
    expect(screen.getByRole('status')).toHaveTextContent('Верно. Теперь здесь 10 десятков.')
    expect(screen.getByText('ШАГ 1 ИЗ 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Дальше/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Дальше/ }))

    expect(screen.getByText('ШАГ 2 ИЗ 5')).toBeInTheDocument()
    expect(screen.getByText('Обмен: 1 десяток → 10 единиц.')).toBeInTheDocument()

    for (const action of actions.slice(1)) await completeAction(user, action)
    expect(screen.getByRole('heading', { name: 'Модель готова!' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Перейти к записи в столбик/ }))
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('даёт короткую подсказку и сохраняет вопрос после неверного ответа', async () => {
    const user = userEvent.setup()
    render(<PlaceValueExplorer a={42} b={22} operation="add" onComplete={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Складываем' })).toBeInTheDocument()
    expect(screen.getByText('Сложи единицы: 2 + 2.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^5$/ }))
    expect(screen.getByRole('status')).toHaveTextContent('Проверь сумму: 2 + 2.')
    expect(screen.getByText('ШАГ 1 ИЗ 2')).toBeInTheDocument()
    expect(screen.getByText('Сложи единицы: 2 + 2.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^4$/ }))
    expect(screen.getByRole('status')).toHaveTextContent('Верно: получилось 4 единицы.')
    expect(screen.getByRole('button', { name: /^4$/ })).toBeDisabled()
    expect(screen.getByText('ШАГ 1 ИЗ 2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Дальше/ }))
    expect(screen.getByText('Сложи десятки: 4 + 2.')).toBeInTheDocument()
  })

  it('показывает визуальную связь 10 единиц и 1 десятка отдельным шагом', async () => {
    const user = userEvent.setup()
    const actions = buildPlaceValueActions(19, 2, 'add')
    render(<PlaceValueExplorer a={19} b={2} operation="add" onComplete={vi.fn()} />)

    await completeAction(user, actions[0]!)
    expect(screen.getByText('10 единиц = 1 десяток.')).toBeInTheDocument()
    expect(screen.getByLabelText('10 единиц — 1 десяток')).toBeInTheDocument()
    expect(screen.getByText('После обмена останется 1 единица.')).toBeInTheDocument()

    await user.click(screen.getByTestId('model-exchange-action'))
    expect(screen.getByRole('status')).toHaveTextContent('Верно. Осталось 1 единица. Появился 1 десяток.')
  })
})
