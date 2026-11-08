import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'

const itemClass =
  'flex min-h-11 w-full items-center px-3.5 text-left transition-colors duration-150 ease-out hover:bg-paper-200 focus-visible:bg-paper-200 focus-visible:outline-none'

/**
 * Row actions for one listing: Edit, Mark reserved / active, Mark sold, Delete.
 * Menu-button pattern: arrows move, Esc closes and returns focus to the button.
 */
export function RowActionsMenu({ listing, onSetStatus, onDelete, disabled }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()
  const label = `Actions for ${listing.title}`

  useEffect(() => {
    if (!open) return undefined
    menuRef.current?.querySelector('[role="menuitem"]')?.focus()
    function onPointerDown(e) {
      if (menuRef.current?.contains(e.target) || buttonRef.current?.contains(e.target))
        return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function close({ refocus = true } = {}) {
    setOpen(false)
    if (refocus) buttonRef.current?.focus()
  }

  function choose(action) {
    close({ refocus: false })
    action()
  }

  function onKeyDown(e) {
    const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? [])
    const i = items.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(i + 1) % items.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i - 1 + items.length) % items.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      items[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      items[items.length - 1]?.focus()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'grid size-11 place-items-center rounded-paper text-ink-900 transition-colors duration-150 ease-out hover:bg-paper-200 disabled:text-ink-300',
          open && 'bg-paper-200',
        )}
      >
        <MoreHorizontal size={20} strokeWidth={1.5} aria-hidden="true" />
      </button>
      {open && (
        <ul
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onKeyDown}
          className="absolute top-full right-0 z-30 mt-1 w-56 rounded-paper border border-paper-400 bg-paper-50 py-1 text-left shadow-stack"
        >
          <li role="none">
            <Link
              role="menuitem"
              to={`/listings/${listing.id}/edit`}
              className={itemClass}
            >
              Edit
            </Link>
          </li>
          {listing.status === 'active' && (
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className={itemClass}
                onClick={() => choose(() => onSetStatus(listing, 'reserved'))}
              >
                Mark reserved
              </button>
            </li>
          )}
          {listing.status === 'reserved' && (
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className={itemClass}
                onClick={() => choose(() => onSetStatus(listing, 'active'))}
              >
                Mark active again
              </button>
            </li>
          )}
          {listing.status !== 'sold' && (
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className={itemClass}
                onClick={() => choose(() => onSetStatus(listing, 'sold'))}
              >
                Mark sold
              </button>
            </li>
          )}
          <li role="separator" className="my-1 border-t border-paper-300" />
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className={cn(itemClass, 'text-redpen-600 hover:text-redpen-700')}
              onClick={() => choose(() => onDelete(listing))}
            >
              Delete listing
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
