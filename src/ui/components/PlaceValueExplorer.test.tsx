import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PlaceValueExplorer } from './PlaceValueExplorer'

describe('исследование модели разрядов', () => {
  it('показывает два последовательных размена при вычитании через нули', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<PlaceValueExplorer a={500} b={127} operation="subtract" onComplete={onComplete} />)

    expect(screen.getByText(/одна сотня равна десяти десяткам/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Обменять 10 сотен на 1 десяток/ }))
    expect(screen.getByText('ШАГ 1 ИЗ 5')).toBeInTheDocument()
    expect(screen.getByText(/Ошибки здесь ничего не отнимают/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Обменять 1 сотню на 10 десятков/ }))
    expect(screen.getByText('10 △ = 1 сотня')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Обменять 1 десяток на 10 единиц/ }))
    expect(screen.getByText('10 • = 1 △')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^3$/ }))
    await user.click(screen.getByRole('button', { name: /^7$/ }))
    await user.click(screen.getByRole('button', { name: /^3$/ }))

    expect(screen.queryByText('10 • = 1 △')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Перейти к записи в столбик/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Перейти к записи в столбик/ }))
    expect(onComplete).toHaveBeenCalledOnce()
  })
})
