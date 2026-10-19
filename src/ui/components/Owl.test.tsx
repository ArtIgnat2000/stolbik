import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Owl } from './Owl'

describe('Сова БУК с обувью', () => {
  it('не рисует обувь, пока пара не надета', () => {
    const { container } = render(<Owl accessories={['cap', 'glasses']} />)
    expect(container.querySelector('[data-shoes]')).toBeNull()
  })

  it('рисует слой обуви для надетой пары', () => {
    const { container } = render(<Owl accessories={['cap', 'shoes-neon']} />)
    const shoes = container.querySelector('[data-shoes]')
    expect(shoes).not.toBeNull()
    expect(shoes?.getAttribute('data-shoes')).toBe('shoes-neon')
    const feet = Array.from(shoes?.children ?? []).filter((node) => node.tagName === 'g')
    expect(feet).toHaveLength(2)
  })

  it('не падает на неизвестном id обуви', () => {
    const { container } = render(<Owl accessories={['shoes-unknown']} />)
    expect(container.querySelector('[data-shoes]')).toBeNull()
  })
})
