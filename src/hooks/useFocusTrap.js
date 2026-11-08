import { useEffect } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Keeps Tab inside `ref` while `active`, and hands focus back to whatever opened it
 * when it closes (section 9). Shared by Dialog and Sheet.
 *   useFocusTrap(panelRef, open)
 * Focus starts on the first element with [data-autofocus], else the first focusable one.
 */
export function useFocusTrap(ref, active) {
  useEffect(() => {
    if (!active) return
    const root = ref.current
    if (!root) return
    const trigger = document.activeElement
    const focusables = () =>
      [...root.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)

    const first = root.querySelector('[data-autofocus]') ?? focusables()[0] ?? root
    first.focus()

    function onKeyDown(e) {
      if (e.key !== 'Tab') return
      const list = focusables()
      if (list.length === 0) {
        e.preventDefault()
        return
      }
      const head = list[0]
      const tail = list[list.length - 1]
      if (
        e.shiftKey &&
        (document.activeElement === head || document.activeElement === root)
      ) {
        e.preventDefault()
        tail.focus()
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault()
        head.focus()
      }
    }

    root.addEventListener('keydown', onKeyDown)
    return () => {
      root.removeEventListener('keydown', onKeyDown)
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [ref, active])
}
