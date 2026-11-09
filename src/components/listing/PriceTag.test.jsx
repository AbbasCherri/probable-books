import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PriceTag } from './PriceTag'

const price = () => screen.getByText('$45')

describe('PriceTag', () => {
  it('prints the price in tabular figures with the savings under it', () => {
    render(<PriceTag cents={4500} retailCents={18900} />)
    expect(price()).toHaveClass(
      'font-serif',
      'tabular-nums',
      'text-price',
      'text-ink-900',
    )
    expect(screen.getByText('76% under retail')).toBeInTheDocument()
  })

  it.each([
    ['sm', 'text-lead'],
    ['md', 'text-price'],
    ['lg', 'text-h2'],
    ['xl', 'text-h1'],
  ])('size %s uses %s', (size, cls) => {
    render(<PriceTag cents={4500} size={size} />)
    expect(price()).toHaveClass(cls)
  })

  it.each([
    ['default', 'text-ink-900'],
    ['pen', 'text-pen-600'],
    ['muted', 'text-ink-500'],
  ])('tone %s inks the figure %s', (tone, cls) => {
    render(<PriceTag cents={4500} tone={tone} />)
    expect(price()).toHaveClass(cls)
  })

  it('as="span" stays inline, for a price inside a sentence', () => {
    render(
      <p>
        <PriceTag as="span" cents={4500} tone="pen" /> from Sam
      </p>,
    )
    expect(price().tagName).toBe('SPAN')
    expect(price().closest('p').querySelector('div, p p')).toBeNull()
  })
})
