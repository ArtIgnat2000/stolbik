import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PlaceValueExplorer } from './PlaceValueExplorer'

describe('исследование модели разрядов', () => {
  it('показывает два последовательных размена при вычитании через нули', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<PlaceValueExplorer a={500} b={127} operation="subtract" onComplete={onComplete} />)

    expect(screen.getByRole('heading', { name: 'Вычитаем по разрядам' })).toBeInTheDocument()
    expect(screen.getByText('1 точка — 1 единица')).toBeInTheDocument()
    expect(screen.getByText('1 треугольник — 1 десяток (10 точек)')).toBeInTheDocument()
    expect(screen.getByText(/В разряде десятков сейчас 0/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Обменять одну сотню на один десяток/ }))
    expect(screen.getByText('ШАГ 1 ИЗ 5')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Ответ не совпал/)

    await user.click(screen.getByRole('button', { name: /Обменять одну сотню на 10 десятков/ }))
    expect(screen.getByText('ШАГ 2 ИЗ 5')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Верно! Переходим к следующему шагу.')
    expect(screen.getByText(/10 десятков — 10 треугольников/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Обменять один десяток на 10 единиц/ }))
    expect(screen.getByText(/10 единиц — 10 точек/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Верно! Переходим к следующему шагу.')
    await user.click(screen.getByRole('button', { name: /^3$/ }))
    await user.click(screen.getByRole('button', { name: /^7$/ }))
    await user.click(screen.getByRole('button', { name: /^3$/ }))

    expect(screen.getByRole('status')).toHaveTextContent('Верно! Модель готова.')
    expect(screen.getByRole('button', { name: /Перейти к записи в столбик/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Перейти к записи в столбик/ }))
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('понятно объясняет действие и сообщает, верен ли ответ', async () => {
    const user = userEvent.setup()
    render(<PlaceValueExplorer a={42} b={22} operation="add" onComplete={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Складываем по разрядам' })).toBeInTheDocument()
    expect(screen.getByText('Сложи единицы: 2 + 2. Сколько получится?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^5$/ }))
    expect(screen.getByRole('status')).toHaveTextContent(/Ответ не совпал/)
    expect(screen.getByText('ШАГ 1 ИЗ 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^4$/ }))
    expect(screen.getByRole('status')).toHaveTextContent('Верно! Переходим к следующему шагу.')
    expect(screen.getByText('Сложи десятки: 4 + 2. Сколько получится?')).toBeInTheDocument()
  })
})
