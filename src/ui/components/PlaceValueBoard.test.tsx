import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { analyzeColumn } from '../../engine/column'
import { PlaceValueBoard } from './PlaceValueBoard'

describe('наглядная модель столбика', () => {
  it('показывает фишки каждого разряда и задание текущего шага', () => {
    const analysis = analyzeColumn(36, 17, 'add')
    render(
      <PlaceValueBoard analysis={analysis} answers={{}} activePlace={0} currentStep={analysis.inputSteps[0]} />
    )

    expect(screen.getByRole('group', { name: 'Значение фишек' })).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: '6 точек' })).toHaveLength(2)
    expect(screen.getAllByRole('img', { name: '7 точек' })).toHaveLength(2)
    expect(screen.getAllByRole('img', { name: '3 треугольника' })).toHaveLength(1)
    expect(screen.getAllByRole('img', { name: '1 треугольник' }).length).toBeGreaterThan(0)
    expect(screen.getByText('Посчитай точки: 6 + 7 = ?')).toBeInTheDocument()
    expect(screen.getByText('Десять точек — это один треугольник. Один уйдёт в разряд десятков, а в этом разряде останется последняя цифра.')).toBeInTheDocument()
    expect(screen.getByText('10 точек = 1 треугольник')).toBeInTheDocument()
    expect(screen.getByText('Впиши цифру в разряд единиц.')).toBeInTheDocument()
  })

  it('подчёркивает активный разряд и показывает фишки уже вписанного ответа', () => {
    const analysis = analyzeColumn(36, 17, 'add')
    const { container } = render(
      <PlaceValueBoard analysis={analysis} answers={{ 0: 3 }} activePlace={1} currentStep={analysis.inputSteps[1]} />
    )

    expect(screen.getByRole('img', { name: '3 точки' })).toBeInTheDocument()
    expect(container.querySelectorAll('.place-cell-active')).toHaveLength(1)
    expect(screen.getByText('Посчитай треугольники: 3 + 1 + 1 = ?')).toBeInTheDocument()
    expect(screen.getByText('Сюда пришёл один треугольник: в прошлом разряде набралось десять точек.')).toBeInTheDocument()
  })

  it('вычитание с разменом показывает рабочие фишки и зачёркивает убираемые', () => {
    const analysis = analyzeColumn(32, 15, 'subtract')
    const { container } = render(
      <PlaceValueBoard analysis={analysis} answers={{}} activePlace={0} currentStep={analysis.inputSteps[0]} />
    )

    expect(screen.getByText('Нужно убрать 5 точек, а в разряде только 2.')).toBeInTheDocument()
    expect(screen.getByText('Разменяем один треугольник на десять точек: стало 12.')).toBeInTheDocument()
    expect(screen.getByText('1 треугольник = 10 точек')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '12 точек' })).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: '5 точек' }).length).toBeGreaterThan(1)
    expect(container.querySelectorAll('.place-task .place-token-crossed')).toHaveLength(5)
  })

  it('новый разряд ответа остаётся в модели пустым до записи цифры', () => {
    const analysis = analyzeColumn(96, 17, 'add')
    render(
      <PlaceValueBoard analysis={analysis} answers={{}} activePlace={2} currentStep={analysis.inputSteps[2]} />
    )

    expect(screen.getByText('пока пусто')).toBeInTheDocument()
    expect(screen.getByText('Впиши цифру в разряд сотен. Это последняя цифра ответа.')).toBeInTheDocument()
  })
})
