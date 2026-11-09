import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Dialog } from './Dialog'

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([{ width: 1, height: 1 }])
  const root = document.createElement('div')
  root.id = 'root'
  document.body.appendChild(root)
})
afterEach(() => {
  vi.restoreAllMocks()
  document.getElementById('root')?.remove()
  document.body.style.overflow = ''
})

function Harness(props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Delete
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete this listing?" {...props}>
        <button type="button" onClick={() => setOpen(false)}>
          Keep it
        </button>
      </Dialog>
    </>
  )
}

describe('Dialog', () => {
  it('locks the page while open and leaves it scrollable after closing', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(document.body.style.overflow).toBe('hidden')
    await user.click(screen.getByRole('button', { name: 'Keep it' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
    expect(document.getElementById('root')).not.toHaveAttribute('inert')
  })

  it('stays scrollable after opening and closing twice (Esc)', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    for (let i = 0; i < 2; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Delete' }))
      await user.keyboard('{Escape}')
    }
    expect(document.body.style.overflow).toBe('')
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus()
  })

  it('description is rendered and tied with aria-describedby', async () => {
    const user = userEvent.setup()
    render(<Harness description="You can't undo this." />)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(
      screen.getByRole('dialog', { name: 'Delete this listing?' }),
    ).toHaveAccessibleDescription("You can't undo this.")
  })

  it('describedBy points at an element the caller renders', async () => {
    const user = userEvent.setup()
    function WithOwnText() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open
          </button>
          <Dialog open={open} onClose={() => setOpen(false)} title="Mark sold?" describedBy="why">
            <p id="why">Buyers with offers are told.</p>
          </Dialog>
        </>
      )
    }
    render(<WithOwnText />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
      'Buyers with offers are told.',
    )
  })

  it('sits on the modal layer over the scrim token and clears the home indicator', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('pb-safe-6')
    expect(dialog.parentElement).toHaveClass('z-modal')
    expect(dialog.previousElementSibling).toHaveClass('bg-scrim/40')
  })
})
