import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card } from './Card'
import { Popover } from './Popover'

describe('Card', () => {
  it('is a sheet of paper (paper-card) with padding, as a div by default', () => {
    render(<Card>Note</Card>)
    const card = screen.getByText('Note')
    expect(card.tagName).toBe('DIV')
    expect(card).toHaveClass('paper-card', 'p-4')
  })

  it('renders as another element and merges className', () => {
    render(
      <Card as="article" aria-label="Offer" padding="none" className="flex gap-3">
        x
      </Card>,
    )
    const card = screen.getByRole('article', { name: 'Offer' })
    expect(card).toHaveClass('paper-card', 'flex', 'gap-3')
    expect(card.className).not.toMatch(/\bp-4\b/)
  })
})

describe('Popover', () => {
  it('is an absolutely positioned paper surface on the popover layer', () => {
    render(
      <Popover open role="menu" aria-label="Actions">
        items
      </Popover>,
    )
    const pop = screen.getByRole('menu', { name: 'Actions' })
    expect(pop).toHaveClass(
      'absolute',
      'top-full',
      'z-popover',
      'bg-paper-50',
      'shadow-stack',
    )
    expect(pop).toHaveClass('left-0')
  })

  it('stays in the DOM but hidden when closed (aria-controls keeps its target)', () => {
    render(
      <Popover open={false} as="ul" id="list" role="listbox" aria-label="Courses">
        <li>x</li>
      </Popover>,
    )
    const pop = screen.getByRole('listbox', { hidden: true })
    expect(pop.tagName).toBe('UL')
    expect(pop).toHaveAttribute('hidden')
  })

  it.each([
    ['end', 'right-0'],
    ['stretch', 'inset-x-0'],
  ])('align %s', (align, cls) => {
    render(
      <Popover open align={align} data-testid="pop">
        x
      </Popover>,
    )
    expect(screen.getByTestId('pop')).toHaveClass(cls)
  })
})
