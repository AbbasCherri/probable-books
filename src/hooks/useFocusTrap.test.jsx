import { useRef, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Sheet } from '@/components/ui/Sheet'
import { useFocusTrap } from './useFocusTrap'

// jsdom does no layout, so every element reports zero client rects and the hook would treat
// it as invisible. Pretend everything rendered has a box.
beforeEach(() => {
  vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([{ width: 1, height: 1 }])
})
afterEach(() => {
  vi.restoreAllMocks()
})

function Harness({ onEscape, children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useFocusTrap(ref, open, {
    onEscape: (event) => {
      onEscape?.(event)
      setOpen(false)
    },
  })
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <button type="button">Outside</button>
      {open && (
        <div ref={ref} role="dialog" aria-label="Trap" tabIndex={-1}>
          {children ?? (
            <>
              <button type="button">First</button>
              <button type="button" disabled>
                Disabled
              </button>
              <a href="/somewhere">Middle</a>
              <button type="button" onClick={() => setOpen(false)}>
                Last
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}

async function openHarness(props) {
  const user = userEvent.setup()
  render(<Harness {...props} />)
  const trigger = screen.getByRole('button', { name: 'Open' })
  await user.click(trigger)
  return { user, trigger }
}

describe('useFocusTrap', () => {
  it('moves focus to the first focusable element', async () => {
    await openHarness()
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
  })

  it('prefers [data-autofocus]', async () => {
    await openHarness({
      children: (
        <>
          <button type="button">One</button>
          <button type="button" data-autofocus>
            Two
          </button>
        </>
      ),
    })
    expect(screen.getByRole('button', { name: 'Two' })).toHaveFocus()
  })

  it('wraps Tab from last to first and Shift+Tab from first to last', async () => {
    const { user } = await openHarness()
    const first = screen.getByRole('button', { name: 'First' })
    const last = screen.getByRole('button', { name: 'Last' })

    await user.tab()
    expect(screen.getByRole('link', { name: 'Middle' })).toHaveFocus() // skips disabled
    await user.tab()
    expect(last).toHaveFocus()
    await user.tab()
    expect(first).toHaveFocus()
    await user.tab({ shift: true })
    expect(last).toHaveFocus()
  })

  it('calls onEscape on Esc and returns focus to the trigger', async () => {
    const onEscape = vi.fn()
    const { user, trigger } = await openHarness({ onEscape })
    await user.keyboard('{Escape}')
    expect(onEscape).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('lets a search box with text clear itself before Esc closes', async () => {
    const onEscape = vi.fn()
    const { user } = await openHarness({
      onEscape,
      children: <input type="search" aria-label="Search" defaultValue="chem" />,
    })
    expect(screen.getByRole('searchbox')).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(onEscape).not.toHaveBeenCalled()
  })

  it('locks body scroll while open and restores it after', async () => {
    const { user } = await openHarness()
    expect(document.body.style.overflow).toBe('hidden')
    await user.keyboard('{Escape}')
    expect(document.body.style.overflow).toBe('')
  })
})

describe('Sheet', () => {
  function SheetHarness({ onClose }) {
    const [open, setOpen] = useState(false)
    const close = () => {
      onClose()
      setOpen(false)
    }
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Filters
        </button>
        <Sheet open={open} onClose={close} title="Filters">
          <label>
            Course <input />
          </label>
        </Sheet>
      </>
    )
  }

  it('traps focus, closes on Esc and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<SheetHarness onClose={onClose} />)
    const trigger = screen.getByRole('button', { name: 'Filters' })

    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Filters' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    const close = screen.getByRole('button', { name: 'Close' })
    expect(close).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('textbox', { name: 'Course' })).toHaveFocus()
    await user.tab()
    expect(close).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
