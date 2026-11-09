import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithRouter } from '@/test/render'
import { ListingCard } from './ListingCard'
import { ListingPhoto } from './ListingPhoto'

const listing = {
  id: 'lst_x',
  title: 'TI-84 Plus CE graphing calculator',
  category: 'calculator',
  courseCodes: ['MATH 218', 'PHYS 210', 'EECE 230'],
  condition: 'worn',
  priceCents: 3650,
  retailCents: 16000,
  status: 'active',
  createdAt: '2020-01-01T00:00:00.000Z',
  photos: [],
  seller: { name: 'Sam' },
}

describe('ListingPhoto', () => {
  it('without a photo, draws a ruled index card with the category and title', () => {
    render(<ListingPhoto listing={listing} />)
    expect(screen.getByText('Calculators')).toBeInTheDocument()
    expect(screen.getByText(listing.title)).toBeInTheDocument()
  })

  it('compact: a category icon instead of text that would clip in a small thumb', () => {
    const { container } = render(<ListingPhoto listing={listing} compact />)
    expect(screen.queryByText('Calculators')).not.toBeInTheDocument()
    expect(screen.queryByText(listing.title)).not.toBeInTheDocument()
    const card = container.firstElementChild
    expect(card).toHaveAttribute('aria-hidden', 'true')
    expect(card).toHaveClass('aspect-4/3')
    expect(card.querySelector('svg')).toBeInTheDocument()
  })

  it('compact still shows a real photo', () => {
    render(
      <ListingPhoto
        listing={{ ...listing, photos: [{ url: '/x.jpg', alt: 'Calculator front' }] }}
        compact
      />,
    )
    expect(screen.getByRole('img', { name: 'Calculator front' })).toBeInTheDocument()
  })
})

describe('ListingCard', () => {
  it('card: price, then the savings line on its own, then the grade (stacked on phones)', () => {
    renderWithRouter(<ListingCard listing={listing} />)
    const savings = screen.getByText('77% under retail')
    const footer = savings.closest('[data-card-footer]')
    expect(footer).toHaveClass('flex-col', 'sm:flex-row')
    // The grade word never shares a squeezed row with the savings line.
    const grade = screen.getByText('Well-worn')
    expect(footer).toContainElement(grade)
    expect(grade.closest('span.inline-flex')).toHaveClass('whitespace-nowrap')
  })

  it('row: uses the compact photo', () => {
    renderWithRouter(<ListingCard listing={listing} variant="row" />)
    expect(screen.queryByText('Calculators')).not.toBeInTheDocument()
  })
})
