import { StrictMode } from 'react'
import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { renderWithRouter } from '@/test/render'
import { RootLayout } from './RootLayout'

function Page({ title }) {
  useDocumentTitle(title)
  return (
    <>
      <h1>{title}</h1>
      <button type="button">Stay here</button>
    </>
  )
}

// StrictMode runs mount effects twice, as in development: neither run may move focus.
function renderLayout(route = '/', { strict = false } = {}) {
  const layout = strict ? (
    <StrictMode>
      <RootLayout />
    </StrictMode>
  ) : (
    <RootLayout />
  )
  return renderWithRouter(layout, {
    route,
    path: '/',
    auth: true,
    children: [
      { index: true, element: <Page title="Home" /> },
      { path: 'browse', element: <Page title="Browse" /> },
    ],
  })
}

beforeEach(() => {
  // ScrollRestoration scrolls on navigation; jsdom does not implement it.
  window.scrollTo = vi.fn()
})

describe('RootLayout', () => {
  it('leaves focus alone on the first render, in StrictMode too', () => {
    renderLayout('/', { strict: true })
    expect(screen.getByRole('main')).not.toHaveFocus()
    expect(screen.getByTestId('route-announcer')).toHaveTextContent('')
  })

  it('moves focus to main and announces the new title after a route change', async () => {
    const { router } = renderLayout('/', { strict: true })
    await act(() => router.navigate('/browse'))
    expect(await screen.findByRole('heading', { name: 'Browse' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveFocus()
    await waitFor(() =>
      expect(screen.getByTestId('route-announcer')).toHaveTextContent(
        'Browse | Probable Books',
      ),
    )
    expect(screen.getByTestId('route-announcer')).toHaveAttribute('aria-live', 'polite')
  })

  it('does not move focus when only the search params change', async () => {
    const { router, user } = renderLayout('/browse')
    const button = await screen.findByRole('button', { name: 'Stay here' })
    await user.click(button)
    await act(() => router.navigate('/browse?sort=price_asc'))
    expect(button).toHaveFocus()
  })

  it('does not move focus for an in-page anchor (hash) change', async () => {
    const { router, user } = renderLayout('/')
    const button = await screen.findByRole('button', { name: 'Stay here' })
    await user.click(button)
    await act(() => router.navigate('/#fresh'))
    expect(button).toHaveFocus()
  })
})
