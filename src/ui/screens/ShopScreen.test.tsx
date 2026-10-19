import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createProfile, SHOP_CATALOG } from '../../state/profile'
import { ShopScreen } from './ShopScreen'

const noop = () => {}

function renderShop() {
  return render(<ShopScreen profile={createProfile('Аня')} onBack={noop} onBuy={noop} onToggle={noop} onRecolor={noop} />)
}

describe('магазин-витрина', () => {
  it('выкладывает весь каталог на картинку и показывает подсказку', () => {
    const { container } = renderShop()
    expect(container.querySelectorAll('.shop-scene-wardrobe .shop-spot')).toHaveLength(SHOP_CATALOG.length)
    expect(screen.getAllByText('Выбери вещь на витрине')).toHaveLength(1)
  })

  it('выбирает вещь на витрине: примерка, цена и кнопка покупки', async () => {
    const user = userEvent.setup()
    const { container } = renderShop()
    await user.click(screen.getByRole('button', { name: /Кепка/ }))
    const panel = container.querySelector('.shop-section .spot-panel')!
    expect(within(panel as HTMLElement).getByText('Кепка')).toBeInTheDocument()
    expect(within(panel as HTMLElement).getByText(/Козырёк от солнечных примеров/)).toBeInTheDocument()
    expect(within(panel as HTMLElement).getByRole('button', { name: /Купить · 8/ })).toBeInTheDocument()
    expect(within(panel as HTMLElement).getByRole('button', { name: /Купить · 8/ })).toBeDisabled()
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
