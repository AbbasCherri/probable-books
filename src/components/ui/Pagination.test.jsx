import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithRouter } from '@/test/render'
import { Pagination } from './Pagination'

const buildHref = (n) => `/browse?page=${n}`

function renderPagination(props) {
  return renderWithRouter(<Pagination buildHref={buildHref} {...props} />, {
    route: '/browse',
    path: '/browse',
  })
}

// What a sighted reader sees in the folio, in order: page numbers and "..." gaps.
function folio() {
  const nav = screen.getByRole('navigation', { name: 'Pagination' })
  return within(nav)
    .getAllByRole('listitem', { hidden: true })
    .map((li) => li.textContent)
    .filter((text) => text !== 'p.' && text !== 'Previous' && text !== 'Next')
}

describe('Pagination', () => {
  it('renders nothing for a single page', () => {
    renderPagination({ page: 1, pageCount: 1 })
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('marks the current page with aria-current and links the others', () => {
    renderPagination({ page: 2, pageCount: 3 })
    const current = screen.getByRole('link', { current: 'page' })
    expect(current).toHaveTextContent('2')
    expect(current).toHaveAttribute('href', '/browse?page=2')
    expect(screen.getByRole('link', { name: 'Page 1' })).toHaveAttribute(
      'href',
      '/browse?page=1',
    )
    expect(screen.getByRole('link', { name: 'Page 3' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('shows first, last and neighbours with ellipses for the gaps', () => {
    renderPagination({ page: 5, pageCount: 9 })
    expect(folio()).toEqual(['1', '...', '4', '5', '6', '...', '9'])
  })

  it('fills a one-page gap with the page instead of an ellipsis', () => {
    renderPagination({ page: 3, pageCount: 9 })
    expect(folio()).toEqual(['1', '2', '3', '4', '...', '9'])
  })

  it('hides the ellipsis and "p." label from assistive tech', () => {
    renderPagination({ page: 5, pageCount: 9 })
    const nav = screen.getByRole('navigation', { name: 'Pagination' })
    expect(within(nav).getAllByRole('listitem')).toHaveLength(7) // Prev, 5 pages, Next
  })

  it('omits Previous on the first page and Next on the last', () => {
    const { unmount } = renderPagination({ page: 1, pageCount: 4 })
    expect(screen.queryByRole('link', { name: 'Previous' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/browse?page=2',
    )
    unmount()

    renderPagination({ page: 4, pageCount: 4 })
    expect(screen.queryByRole('link', { name: 'Next' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('rel', 'prev')
  })

  it.each([
    [{ page: 99, pageCount: 4 }, '4'],
    [{ page: -3, pageCount: 4 }, '1'],
    [{ page: 'abc', pageCount: 4 }, '1'],
    [{ page: '2.7', pageCount: '4.9' }, '2'],
  ])('clamps bad props %j to page %s', (props, expected) => {
    renderPagination(props)
    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent(expected)
  })

  it.each([{ pageCount: 'junk' }, { pageCount: 0 }, { pageCount: -5 }])(
    'renders nothing for a bad page count %j',
    (props) => {
      renderPagination({ page: 1, ...props })
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    },
  )
})
