import { act, screen, within } from '@testing-library/react'
import { Outlet } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { CoursesProvider } from '@/context/CoursesContext'
import { renderWithRouter } from '@/test/render'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
})

function Layout() {
  return (
    <CoursesProvider>
      <SiteHeader />
      <main>
        <Outlet />
      </main>
      <SiteFooter />
    </CoursesProvider>
  )
}

async function renderHeader() {
  const result = renderWithRouter(<Layout />, {
    auth: true,
    children: [
      { index: true, element: <h1>Home</h1> },
      { path: 'browse', element: <h1>Browse</h1> },
    ],
  })
  // AuthProvider settles (signed out) before the account links show.
  await screen.findByRole('link', { name: 'Get a card' })
  return result
}

const header = () => screen.getByRole('banner')
const menuButton = () => within(header()).getByRole('button', { name: /menu/i })

describe('SiteHeader', () => {
  it('gives the logo and the nav links a 44px hit area', async () => {
    await renderHeader()
    const logo = within(header()).getByRole('link', { name: 'Probable Books' })
    expect(logo).toHaveClass('min-h-11', 'min-w-11')
    const nav = within(header()).getAllByRole('navigation', { name: 'Main' })[0]
    for (const link of within(nav).getAllByRole('link')) {
      expect(link).toHaveClass('min-h-11', 'min-w-11')
    }
    expect(within(header()).getByRole('link', { name: 'Get a card' })).toHaveClass(
      'min-h-11',
    )
  })

  it('closes the menu when the route changes', async () => {
    const { user, router } = await renderHeader()
    await user.click(menuButton())
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true')
    await act(() => router.navigate('/browse'))
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')
  })

  it('Esc closes the menu and puts focus back on the menu button', async () => {
    const { user } = await renderHeader()
    await user.click(menuButton())
    const panel = document.getElementById(menuButton().getAttribute('aria-controls'))
    within(panel).getAllByRole('link')[0].focus()
    await user.keyboard('{Escape}')
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')
    expect(menuButton()).toHaveFocus()
  })

  it('has the Reading light setting in the menu, in sync with the footer', async () => {
    const { user } = await renderHeader()
    await user.click(menuButton())
    const panel = document.getElementById(menuButton().getAttribute('aria-controls'))
    const group = within(panel).getByRole('radiogroup', { name: 'Reading light' })
    const radios = within(group).getAllByRole('radio')
    expect(radios.map((r) => r.labels[0].textContent)).toEqual([
      'Match system',
      'Day',
      'Night',
    ])
    expect(within(group).getByRole('radio', { name: 'Match system' })).toBeChecked()
    await user.click(within(group).getByText('Night'))
    expect(document.documentElement).toHaveAttribute('data-theme', 'night')
    expect(localStorage.getItem('pb.theme')).toBe('night')
    const footer = screen.getByRole('contentinfo')
    expect(
      within(within(footer).getByRole('radiogroup', { name: 'Reading light' })).getByRole(
        'radio',
        { name: 'Night' },
      ),
    ).toBeChecked()
  })
})
