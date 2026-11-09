import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithRouter } from '@/test/render'
import { Alert } from './Alert'
import { ErrorState } from './ErrorState'

describe('Alert', () => {
  it('error tone is an assertive alert in red pen', () => {
    render(
      <Alert tone="error" title="That didn't save">
        Check your connection.
      </Alert>,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent("That didn't save")
    expect(alert).toHaveTextContent('Check your connection.')
    expect(alert).toHaveClass('border-redpen-600', 'bg-redpen-50')
    expect(alert.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it.each(['info', 'success'])('%s tone is a polite status', (tone) => {
    render(<Alert tone={tone}>Draft saved.</Alert>)
    expect(screen.getByRole('status')).toHaveTextContent('Draft saved.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('defaults to info and renders an action', () => {
    render(<Alert action={<button type="button">Undo</button>}>Moved to drafts.</Alert>)
    const status = screen.getByRole('status')
    expect(status).toHaveClass('border-pen-600')
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
  })

  it('can opt out of being a live region (static notes on load)', () => {
    render(
      <Alert tone="info" role={null}>
        Only you can see this draft.
      </Alert>,
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByText('Only you can see this draft.')).toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('page variant renders the page h1 with the shared title style, Retry and a way out', async () => {
    const onRetry = vi.fn()
    const { user } = renderWithRouter(
      <ErrorState
        variant="page"
        title="This page didn't print."
        note="Something jammed on our end."
        onRetry={onRetry}
        secondary={{ to: '/browse', label: 'Browse listings' }}
      />,
    )
    const h1 = screen.getByRole('heading', { level: 1, name: "This page didn't print." })
    expect(h1).toHaveClass('font-serif', 'text-h1-sm', 'sm:text-h1')
    expect(screen.getByRole('alert')).toHaveTextContent('Something jammed on our end.')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
    expect(screen.getByRole('link', { name: 'Browse listings' })).toHaveAttribute(
      'href',
      '/browse',
    )
  })

  it('inline variant is an alert box with an h2 by default, or the heading level asked for', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    const { unmount } = render(
      <ErrorState
        variant="inline"
        title="Couldn't load the index"
        note="Check your connection and try again."
        onRetry={onRetry}
      />,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toContainElement(
      screen.getByRole('heading', { level: 2, name: "Couldn't load the index" }),
    )
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
    unmount()

    render(<ErrorState variant="inline" as="h3" title="No offers loaded" />)
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
