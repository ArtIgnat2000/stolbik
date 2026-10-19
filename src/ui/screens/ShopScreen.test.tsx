import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createProfile, SHOP_CATALOG } from '../../state/profile'
import { ShopScreen } from './ShopScreen'

const noop = () => {}

function renderShop() {
  return render(<ShopScreen profile={createProfile('Аня')} onBack={noop} onBuy={noop} onToggle={noop} onRecolor={noop} />)
}

describe('магазин-примерочная', () => {
  it('показывает все товары и закладки разделов со счётчиками', () => {
    const { container } = renderShop()
    expect(container.querySelectorAll('.goods-card')).toHaveLength(SHOP_CATALOG.length)
    expect(screen.getByRole('button', { name: /^Всё/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Головные уборы/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Очки \d/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Одежда/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Обувь/ })).toBeInTheDocument()
    expect(screen.getAllByText('Выбери вещь на витрине')).toHaveLength(1)
  })

  it('фильтрует товары по закладке «Обувь»', async () => {
    const user = userEvent.setup()
    const { container } = renderShop()
    await user.click(screen.getByRole('button', { name: /^Обувь/ }))
    expect(container.querySelectorAll('.goods-card')).toHaveLength(7)
    await user.click(screen.getByRole('button', { name: /^Головные уборы/ }))
    expect(container.querySelectorAll('.goods-card')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: /^Всё/ }))
    expect(container.querySelectorAll('.goods-card')).toHaveLength(SHOP_CATALOG.length)
  })

  it('выбирает товар: крупная примерка, цена и кнопка покупки', async () => {
    const user = userEvent.setup()
    const { container } = renderShop()
    await user.click(screen.getByRole('button', { name: /^Кепка\./ }))
    const panel = container.querySelector('.fitting-panel')!
    expect(within(panel as HTMLElement).getByText('Кепка')).toBeInTheDocument()
    expect(within(panel as HTMLElement).getByText(/Козырёк от солнечных примеров/)).toBeInTheDocument()
    expect(within(panel as HTMLElement).getByRole('button', { name: /Купить · 8/ })).toBeDisabled()
  })

  it('переключает крупный план примерки без кадрирования', async () => {
    const user = userEvent.setup()
    const { container } = renderShop()
    const zoomButton = screen.getByRole('button', { name: /Крупно/ })
    expect(zoomButton).toHaveAttribute('aria-pressed', 'false')
    const stage = container.querySelector('.fitting-stage')!
    expect(stage).not.toHaveClass('fitting-stage-zoom')
    await user.click(zoomButton)
    expect(screen.getByRole('button', { name: /Обычный размер/ })).toHaveAttribute('aria-pressed', 'true')
    expect(stage).toHaveClass('fitting-stage-zoom')
    expect(stage.querySelector('.dress-up-owl')).not.toBeNull()
  })

  it('надевает арт выбранного товара на сову в полный рост', async () => {
    const user = userEvent.setup()
    const { container } = renderShop()
    await user.click(screen.getByRole('button', { name: /^Кепка\./ }))
    const art = container.querySelector('.fitting-stage .dress-up-owl image[data-item-art="cap"]')
    expect(art).not.toBeNull()
    expect(art?.getAttribute('href')).toContain('shop/items/cap.webp')
  })

  it('раскрывает тизер коллекции по точке «скоро»', async () => {
    const user = userEvent.setup()
    const { container } = renderShop()
    expect(container.querySelectorAll('.spot-coming')).toHaveLength(4)
    await user.click(screen.getByRole('button', { name: /Пристань БУКа/ }))
    expect(screen.getByText(/Лодки, катера и яхты/)).toBeInTheDocument()
    expect(screen.getByText('СКОРО')).toBeInTheDocument()
  })
})
