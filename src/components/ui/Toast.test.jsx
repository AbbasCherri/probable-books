import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useToast } from '@/hooks/useToast'
import { ToastProvider } from './Toast'

let root
beforeEach(() => {
  root = document.createElement('div')
  root.id = 'root'
  document.body.appendChild(root)
})
afterEach(() => {
  root.remove()
})

function Page() {
  const toast = useToast()
  return (
    <main id="main" tabIndex={-1}>
      <button type="button" onClick={() => toast('Draft saved.')}>
        Save draft
      </button>
      <button type="button" onClick={() => toast('Listing deleted.')}>
        Delete
      </button>
    </main>
  )
}

function setup() {
  const user = userEvent.setup()
  render(
    <ToastProvider>
      <Page />
    </ToastProvider>,
    { container: root },
  )
  return user
}

const noteFor = (text) => screen.getByText(text).closest('[data-toast]')
const dismissFor = (text) =>
  within(noteFor(text)).getByRole('button', { name: 'Dismiss' })

describe('Toast', () => {
  it('renders outside #root, so it is still announced while #root is inert under a modal', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    const note = noteFor('Draft saved.')
    expect(root.contains(note)).toBe(false)
    expect(document.body.contains(note)).toBe(true)
  })

  it('keeps live regions in place before any toast, so the first one is announced', () => {
    setup()
    const regions = screen.getAllByRole('status')
    expect(regions.length).toBeGreaterThan(0)
    regions.forEach((r) => expect(r).toHaveAttribute('aria-live', 'polite'))
  })

  it('announces only the message: the Dismiss button sits outside the live text', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    const status = screen.getByText('Draft saved.').closest('[role="status"]')
    expect(status).toHaveTextContent(/^Draft saved\.$/)
    expect(within(status).queryByRole('button')).not.toBeInTheDocument()
    expect(dismissFor('Draft saved.')).toBeInTheDocument()
  })

  it('shows newest last and keeps an earlier note in its live region when a later one goes', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    const first = screen.getByText('Draft saved.').closest('[role="status"]')
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(dismissFor('Listing deleted.'))
    expect(screen.getByText('Draft saved.').closest('[role="status"]')).toBe(first)
  })

  it('dismissing a focused note moves focus to the next note, then back where it came from', async () => {
    const user = setup()
    const save = screen.getByRole('button', { name: 'Save draft' })
    await user.click(save)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    // Keyboard user tabs from the page into the notes.
    save.focus()
    dismissFor('Listing deleted.').focus()
    await user.keyboard('{Enter}')
    expect(screen.queryByText('Listing deleted.')).not.toBeInTheDocument()
    expect(dismissFor('Draft saved.')).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.queryByText('Draft saved.')).not.toBeInTheDocument()
    expect(save).toHaveFocus()
  })

  it('falls back to main when focus did not come from the page', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    document.activeElement.blur()
    const dismiss = dismissFor('Draft saved.')
    dismiss.focus()
    await user.click(dismiss)
    expect(document.getElementById('main')).toHaveFocus()
  })

  it('sits above sticky bottom bars (shared offset) on the toast layer', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    const stack = noteFor('Draft saved.').parentElement
    expect(stack).toHaveClass('z-toast', 'bottom-clear-bars')
  })
})
