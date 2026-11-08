import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

// Only what a keyboard user can really land on: not hidden, not inert, not in a disabled fieldset.
function focusables(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
    (el) =>
      !el.matches(':disabled') &&
      !el.closest('[hidden], [inert]') &&
      el.getClientRects().length > 0 &&
      getComputedStyle(el).visibility !== 'hidden',
  )
}

// Body scroll lock and background inertness are shared by every open modal, so the first to open
// locks, and only the last to close releases (closing out of order cannot leave the page stuck).
let locks = 0
let savedOverflow = ''
function lockPage() {
  if (locks++ === 0) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.getElementById('root')?.setAttribute('inert', '')
  }
}
function unlockPage() {
  if (--locks === 0) {
    document.body.style.overflow = savedOverflow
    document.getElementById('root')?.removeAttribute('inert')
  }
}

/**
 * Modal focus management, shared by Sheet and Dialog.
 *   const ref = useRef(null)
 *   useFocusTrap({ active: open, containerRef: ref, onEscape: onClose })
 *   <div ref={ref} tabIndex={-1} role="dialog">...</div>
 * While active: focus moves into the container, Tab/Shift+Tab cycle inside it,
 * Esc calls onEscape (not while a search box still has text to clear), the page behind is locked
 * and made inert. On deactivation focus returns to
 * the element that had it before (if it is still in the DOM).
 */
export function useFocusTrap({ active, containerRef, onEscape }) {
  const escapeRef = useRef(onEscape)

  useEffect(() => {
    escapeRef.current = onEscape
  }, [onEscape])

  useEffect(() => {
    const container = containerRef.current
    if (!active || !container) return undefined

    const previous = document.activeElement
    lockPage()

    const first = focusables(container)[0]
    if (first) first.focus()
    else container.focus()

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        // Esc belongs to something else first: IME composition, another handler, or a search
        // box that clears itself (so one press does not both clear the text and close).
        const target = event.target
        const clearsItself =
          target instanceof HTMLInputElement && target.type === 'search' && target.value
        if (event.defaultPrevented || event.isComposing || clearsItself) return
        event.preventDefault()
        escapeRef.current?.(event)
        return
      }
      if (event.key !== 'Tab') return
      const items = focusables(container)
      if (items.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      const current = document.activeElement
      if (!container.contains(current) || current === container) {
        event.preventDefault()
        const target = event.shiftKey ? lastItem : firstItem
        target.focus()
      } else if (event.shiftKey && current === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && current === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      unlockPage()
      if (previous instanceof HTMLElement && document.body.contains(previous))
        previous.focus()
    }
  }, [active, containerRef])
}
