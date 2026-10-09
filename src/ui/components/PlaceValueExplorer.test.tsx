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

describe('наглядная модель вычитания', () => {
  it('рисует точки и треугольники и показывает размен картинкой', () => {
    const { container } = render(<PlaceValueExplorer a={32} b={15} operation="subtract" onComplete={vi.fn()} />)

    // легенда: настоящие картинки фишек, а не текстовые значки
    const guide = container.querySelector('.model-symbol-guide')!
    expect(guide.querySelectorAll('.pv-mark-dot')).toHaveLength(1)
    expect(guide.querySelectorAll('.pv-mark-triangle')).toHaveLength(1)
    expect(guide.querySelectorAll('.pv-mark-hundred')).toHaveLength(1)
    expect(guide.querySelector('.pv-mark-triangle')!.querySelectorAll('circle')).toHaveLength(10)

    // первое число: 3 треугольника и 2 точки, второе: 1 треугольник и 5 точек
    const [firstCard, secondCard] = Array.from(container.querySelectorAll('.place-operand-card'))
    expect(firstCard!.querySelectorAll('.pv-chips-place-1 .pv-chip')).toHaveLength(3)
    expect(firstCard!.querySelectorAll('.pv-chips-place-0 .pv-chip')).toHaveLength(2)
    expect(secondCard!.querySelectorAll('.pv-chips-place-1 .pv-chip')).toHaveLength(1)
    expect(secondCard!.querySelectorAll('.pv-chips-place-0 .pv-chip')).toHaveLength(5)

    // первый шаг — размен: картинка «1 десяток = 10 единиц»
    const exchange = container.querySelector('.model-exchange-card')!
    expect(exchange).not.toBeNull()
    expect(exchange.querySelectorAll('.pv-chips-place-1 .pv-chip')).toHaveLength(1)
    expect(exchange.querySelectorAll('.pv-chips-place-0 .pv-chip')).toHaveLength(10)
    expect(exchange.textContent).toContain('1 десяток')
    expect(exchange.textContent).toContain('10 единиц')

    // один треугольник помечен как размениваемый, в единицах пока только 2 точки
    const columns = Array.from(container.querySelectorAll('.model-board-column'))
    const tensColumn = columns.find((column) => column.textContent?.includes('десятки'))!
    const unitsColumn = columns.find((column) => column.textContent?.includes('единицы'))!
    expect(tensColumn.querySelectorAll('.pv-chip-group-source')).toHaveLength(1)
    expect(tensColumn.querySelector('.model-board-flag')!.textContent).toBe('размен')
    expect(unitsColumn.querySelectorAll('.pv-chip')).toHaveLength(2)
    expect(unitsColumn.querySelector('.model-board-flag')!.textContent).toBe('сюда')
  })

  it('перечёркивает убираемые точки, чтобы посчитать остаток', async () => {
    const user = userEvent.setup()
    const { container } = render(<PlaceValueExplorer a={32} b={15} operation="subtract" onComplete={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /Обменять один десяток на 10 единиц/ }))

    const unitsColumn = Array.from(container.querySelectorAll('.model-board-column'))
      .find((column) => column.textContent?.includes('единицы'))!
    // в разряде единиц 12 точек: 7 остаются, 5 перечёркнуты
    expect(unitsColumn.querySelectorAll('.pv-chip')).toHaveLength(12)
    expect(unitsColumn.querySelectorAll('.pv-chip-crossed')).toHaveLength(5)
    expect(unitsColumn.querySelector('.model-board-flag')!.textContent).toBe('− 5 единиц')
    expect(unitsColumn.textContent).toContain('12 единиц — 12 точек')
  })

  it('показывает результат моделью картинками', async () => {
    const user = userEvent.setup()
    const { container } = render(<PlaceValueExplorer a={32} b={15} operation="subtract" onComplete={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /Обменять один десяток на 10 единиц/ }))
    await user.click(screen.getByRole('button', { name: /^7$/ }))
    await user.click(screen.getByRole('button', { name: /^1$/ }))

    const resultCard = container.querySelector('.model-result-card')!
    expect(resultCard.textContent).toContain('32 − 15 = 17')
    expect(resultCard.querySelectorAll('.pv-chips-place-1 .pv-chip')).toHaveLength(1)
    expect(resultCard.querySelectorAll('.pv-chips-place-0 .pv-chip')).toHaveLength(7)
    expect(resultCard.textContent).toContain('1 десяток — 1 треугольник')
    expect(resultCard.textContent).toContain('7 единиц — 7 точек')
  })
})
