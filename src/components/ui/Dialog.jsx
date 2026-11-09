import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { cn } from '@/lib/cn'

/**
 * A modal sheet of paper (section 4). Below sm it rises from the bottom as a sheet, from sm
 * it sits centred. Traps focus, closes on Esc, the Close button or a click outside, and
 * returns focus to the trigger.
 *
 *   <Dialog open={open} onClose={() => setOpen(false)} title="Delete this listing?">
 *     <p className="mt-2 text-ink-700">You can't undo this.</p>
 *   </Dialog>
 *
 * Put [data-autofocus] on the control that should take focus first (the amount field, say).
 */
export function Dialog({ open, onClose, title, className, children }) {
  const panel = useRef(null)
  const titleId = useId()
  useFocusTrap(panel, open)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-scrim/40"
        onClick={onClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            onClose()
          }
        }}
        className={cn(
          // Same height cap as Sheet; pb-safe-6 clears the home indicator on phones.
          'relative max-h-5/6 w-full overflow-y-auto rounded-t-dialog border border-paper-400 bg-paper-50 px-5 pt-3 pb-safe-6 shadow-stack outline-none sm:max-w-md sm:rounded-dialog sm:px-6',
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <h2
            id={titleId}
            className="flex-1 pt-2.5 font-sans text-h3 font-semibold text-ink-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 grid size-11 shrink-0 place-items-center rounded-paper text-ink-900 transition-paper hover:bg-paper-200"
          >
            <X strokeWidth={1.5} aria-hidden="true" className="size-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
