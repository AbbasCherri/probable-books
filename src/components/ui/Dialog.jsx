import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { cn } from '@/lib/cn'

/**
 * A modal sheet of paper (section 4). Below sm it rises from the bottom as a sheet, from sm
 * it sits centred. Traps focus, closes on Esc, the Close button or a click outside, and
 * returns focus to the trigger. useFocusTrap locks page scroll and makes #root inert while it
 * is open, and releases both when the last modal closes.
 *
 *   <Dialog open={open} onClose={() => setOpen(false)} title="Delete this listing?"
 *     description="You can't undo this.">
 *     <div className="mt-5 flex gap-3">...buttons</div>
 *   </Dialog>
 *
 * description: a line under the title, tied with aria-describedby. Or render your own text
 * and pass its id as describedBy. Put [data-autofocus] on the control that should take focus
 * first (the amount field, say).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  describedBy,
  className,
  children,
}) {
  const panel = useRef(null)
  const titleId = useId()
  const descId = useId()
  useFocusTrap(panel, open)

  if (!open) return null

  const describedByIds =
    [description ? descId : null, describedBy].filter(Boolean).join(' ') || undefined

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-end justify-center sm:items-center sm:p-6">
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
        aria-describedby={describedByIds}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            onClose()
          }
        }}
        className={cn(
          // pb-safe-6 clears the home indicator on phones.
          'relative max-h-11/12 w-full overflow-y-auto rounded-t-dialog border border-paper-400 bg-paper-50 px-5 pt-3 pb-safe-6 shadow-stack outline-none sm:max-w-md sm:rounded-dialog sm:px-6',
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
        {description && (
          <p id={descId} className="mt-2 text-ink-700">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
