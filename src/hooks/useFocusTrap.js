import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusables(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('hidden') && !el.closest('[hidden]'),
  )
}

/**
 * Modal focus management, shared by Sheet and Dialog.
 *   const ref = useRef(null)
 *   useFocusTrap({ active: open, containerRef: ref, onEscape: onClose })
 *   <div ref={ref} tabIndex={-1} role="dialog">...</div>
 * While active: focus moves into the container, Tab/Shift+Tab cycle inside it,
 * Esc calls onEscape, body scroll is locked. On deactivation focus returns to
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
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const first = focusables(container)[0]
    if (first) first.focus()
    else container.focus()

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation()
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
      document.body.style.overflow = previousOverflow
      if (previous instanceof HTMLElement && document.body.contains(previous)) previous.focus()
    }
  }, [active, containerRef])
}
