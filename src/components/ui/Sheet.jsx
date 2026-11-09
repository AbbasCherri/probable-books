import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useFocusTrap } from '@/hooks/useFocusTrap'

// Drag distance that closes the sheet, in rem so it follows the user's text size.
const CLOSE_DRAG_REM = 5
const remPx = () =>
  Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16

/**
 * Bottom sheet for phone-only panels (Browse filters).
 *   <Sheet open={open} onClose={() => setOpen(false)} title="Filters"
 *          footer={<Button className="w-full">Show 24 results</Button>}>
 *     ...fields
 *   </Sheet>
 * Renders nothing when closed. Closes on Close button, Esc, scrim click, or
 * dragging the handle down past 5rem. Focus is trapped and restored.
 */
export function Sheet({ open, onClose, title, footer, children, className }) {
  if (!open) return null
  return (
    <SheetPanel onClose={onClose} title={title} footer={footer} className={className}>
      {children}
    </SheetPanel>
  )
}

function SheetPanel({ onClose, title, footer, children, className }) {
  const panelRef = useRef(null)
  const titleId = useId()
  const startY = useRef(null)
  const [dragY, setDragY] = useState(0)
  const [entered, setEntered] = useState(false)

  useFocusTrap(panelRef, true, { onEscape: onClose })

  // Slide-up: start off-screen, move to rest on the next frame. Transitions
  // are disabled globally under prefers-reduced-motion.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  function onPointerDown(event) {
    // One finger or the primary mouse button only; a second touch must not restart the drag.
    if (!event.isPrimary || event.button !== 0 || startY.current !== null) return
    startY.current = event.clientY
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // The pointer is already gone; the drag simply will not start.
      startY.current = null
    }
  }

  function onPointerMove(event) {
    if (startY.current === null) return
    setDragY(Math.max(0, event.clientY - startY.current))
  }

  function endDrag(event) {
    if (startY.current === null) return
    const distance = event.clientY - startY.current
    startY.current = null
    setDragY(0)
    if (event.type === 'pointerup' && distance > CLOSE_DRAG_REM * remPx()) onClose?.()
  }

  const dragging = dragY > 0

  return createPortal(
    <div className="fixed inset-0 z-40">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-scrim/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        // The live drag offset is the one computed value; it follows the finger frame by frame.
        style={dragging ? { '--drag-y': `${dragY}px` } : undefined}
        className={cn(
          'absolute inset-x-0 bottom-0 flex max-h-sheet flex-col rounded-t-dialog border border-b-0 border-paper-400 bg-paper-50 shadow-stack outline-none',
          dragging
            ? 'translate-y-(--drag-y)'
            : 'motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out',
          !entered && 'motion-safe:translate-y-full',
          className,
        )}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          className="grid h-6 shrink-0 cursor-grab touch-none place-items-center"
        >
          <span aria-hidden="true" className="h-1 w-10 rounded-full bg-paper-400" />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-paper-300 pr-2 pl-4">
          <h2 id={titleId} className="font-sans text-h3 font-semibold text-ink-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-paper px-3 text-ink-900 transition-paper hover:bg-paper-200"
          >
            <X strokeWidth={1.5} aria-hidden="true" className="size-5" />
            Close
          </button>
        </div>
        {/* Whatever sits last clears the home indicator (pb-safe-4). */}
        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto overscroll-contain p-4',
            !footer && 'pb-safe-4',
          )}
        >
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-paper-300 bg-paper-50 p-4 pb-safe-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
