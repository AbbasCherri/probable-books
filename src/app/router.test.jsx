import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/context/AuthContext'
import { routes } from './router'

// A page that crashes while rendering, to reach the error boundary.
vi.mock('@/pages/not-found/NotFoundPage', () => ({
  default: function Broken() {
    throw new Error('Torn page')
  },
}))

function renderApp(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return router
}

beforeEach(() => {
  window.scrollTo = vi.fn()
  // React and the router log the thrown error; keep the test output readable.
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('router', () => {
  it('shows RouteError inside the site chrome when a page throws', async () => {
    renderApp('/missing')
    const alert = await screen.findByRole('alert')
    expect(
      within(alert).getByRole('heading', { level: 1, name: /this page didn.t print/i }),
    ).toBeInTheDocument()
    expect(within(alert).getByRole('button', { name: 'Reload' })).toBeInTheDocument()
    expect(within(alert).getByRole('link', { name: /home/i })).toHaveAttribute(
      'href',
      '/',
    )
    // Still inside the layout: header and footer render around it.
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('lazy-loads a page and prints its folio in the footer', async () => {
    renderApp('/login')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign in' }),
    ).toBeVisible()
    expect(within(screen.getByRole('contentinfo')).getByText('p. 7')).toBeInTheDocument()
  })

  it('gives every page route a folio', () => {
    const pages = routes[0].children[0].children.flatMap((r) =>
      r.children ? r.children : [r],
    )
    for (const r of pages) expect(r.handle?.folio, r.path).toEqual(expect.any(Number))
  })
})
