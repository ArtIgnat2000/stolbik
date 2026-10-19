import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Owl } from './Owl'

describe('Сова БУК: арты вещей на сове', () => {
  it('не рисует вещи, пока ничего не надето', () => {
    const { container } = render(<Owl accessories={[]} />)
    expect(container.querySelector('image[data-item-art]')).toBeNull()
    expect(container.querySelector('[data-shoes]')).toBeNull()
  })

  it('помещает арт товара на сову тем же файлом, что на карточке', () => {
    const { container } = render(<Owl accessories={['cap', 'shoes-neon']} />)
    const cap = container.querySelector('image[data-item-art="cap"]')
    expect(cap).not.toBeNull()
    expect(cap?.getAttribute('href')).toContain('shop/items/cap.webp')
    const shoes = container.querySelectorAll('image[data-item-art="shoes-neon"]')
    expect(shoes).toHaveLength(2)
    expect(shoes[0].getAttribute('href')).toContain('shop/items/shoes-neon-l.webp')
    expect(shoes[1].getAttribute('href')).toContain('shop/items/shoes-neon-r.webp')
  })

  it('не рисует старый SVG-слой, когда у вещи есть арт', () => {
    const { container } = render(<Owl accessories={['shoes-neon']} />)
    expect(container.querySelector('[data-shoes]')).toBeNull()
    expect(container.querySelector('image[data-item-art="shoes-neon"]')).not.toBeNull()
  })

  it('не падает на неизвестном id', () => {
    const { container } = render(<Owl accessories={['shoes-unknown']} />)
    expect(container.querySelector('[data-shoes]')).toBeNull()
    expect(container.querySelector('image[data-item-art]')).toBeNull()
  })
})
