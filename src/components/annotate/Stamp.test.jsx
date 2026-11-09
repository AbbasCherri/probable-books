import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LISTING_STATUSES, OFFER_STATUSES } from '@/lib/constants'
import { Stamp } from './Stamp'

describe('Stamp', () => {
  it.each(Object.entries({ ...LISTING_STATUSES, ...OFFER_STATUSES }))(
    'stamps %s with its label from constants',
    (status, { label }) => {
      render(<Stamp status={status} />)
      expect(screen.getByText(label, { exact: true })).toBeInTheDocument()
    },
  )

  it.each([
    ['countered', 'Countered'],
    ['withdrawn', 'Withdrawn'],
    ['draft', 'Draft'],
  ])('has a stamp of its own for %s', (status, label) => {
    render(<Stamp status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it.each([undefined, null, '', 'archived'])('renders nothing for %j', (status) => {
    const { container } = render(<Stamp status={status} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('backs the word with a colour: sold in red pen, withdrawn muted', () => {
    const { rerender } = render(<Stamp status="sold" />)
    expect(screen.getByText('Sold')).toHaveClass('text-redpen-600')
    rerender(<Stamp status="withdrawn" />)
    expect(screen.getByText('Withdrawn')).toHaveClass('text-ink-500')
  })
})
