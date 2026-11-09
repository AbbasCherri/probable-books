import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { ToastContext } from '@/context/ToastContext'
import { cn } from '@/lib/cn'

const SHOW_MS = 5000
const RESUME_MS = 3000
const MAX_VISIBLE = 3
const SLOTS = Array.from({ length: MAX_VISIBLE }, (_, i) => i)
// Full class names so Tailwind finds them: newest note last.
const ORDER = ['order-1', 'order-2', 'order-3']

let nextId = 0

/**
 * Sticky-note toasts (section 4). Mount once, in RootLayout, around <Outlet />,
 * so a toast survives navigation (the sell form navigates to the new listing
 * and the toast shows there). Show one with useToast().
 *
 * - The notes render in a portal on <body>, outside #root, so they are still seen and announced
 *   while a dialog makes #root inert. They sit on the z-toast layer.
 * - Each note's message sits in its own polite live region (role="status"), and the Dismiss
 *   button sits outside it, so screen readers read the message alone. The regions stay in the
 *   DOM (empty) between toasts, so the first message is announced too, and a note keeps its
 *   region until it goes, so dismissing one never re-reads another.
 * - Below lg they sit above any sticky bottom bar marked [data-sticky-bar] (bottom-clear-bars,
 *   src/styles/index.css).
 * - Dismissing a note that has focus moves focus to the next note, else back to where focus was
 *   before it entered the notes, else to <main>.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())
  const stack = useRef(null)
  const returnTo = useRef(null)

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const schedule = useCallback(
    (id, ms) => {
      clearTimeout(timers.current.get(id))
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), ms),
      )
    },
    [dismiss],
  )

  const pause = useCallback((id) => {
    clearTimeout(timers.current.get(id))
  }, [])

  const show = useCallback(
    (message) => {
      nextId += 1
      const id = nextId
      setToasts((list) => {
        let kept = list
        // Full: the oldest note makes way, and the new one takes its live region.
        if (kept.length >= MAX_VISIBLE) {
          const oldest = kept.reduce((a, b) => (a.id < b.id ? a : b))
          clearTimeout(timers.current.get(oldest.id))
          timers.current.delete(oldest.id)
          kept = kept.filter((t) => t !== oldest)
        }
        const used = new Set(kept.map((t) => t.slot))
        const slot = SLOTS.find((s) => !used.has(s))
        return [...kept, { id, message, slot }]
      })
      schedule(id, SHOW_MS)
      return id
    },
    [schedule],
  )

  // The reader pressed Dismiss. If focus was in that note, put it somewhere sensible first.
  const dismissByUser = useCallback(
    (id) => {
      const note = stack.current?.querySelector(`[data-toast="${id}"]`)
      if (note?.contains(document.activeElement)) {
        const others = toasts.filter((t) => t.id !== id).sort((a, b) => a.id - b.id)
        const next = others.find((t) => t.id > id) ?? others[others.length - 1]
        const nextButton = next
          ? stack.current.querySelector(`[data-toast="${next.id}"] button`)
          : null
        const back = returnTo.current
        const backUsable =
          back instanceof HTMLElement && back.isConnected && !back.closest('[inert]')
        const target = nextButton ?? (backUsable ? back : document.getElementById('main'))
        target?.focus()
      }
      dismiss(id)
    },
    [toasts, dismiss],
  )

  useEffect(() => {
    const map = timers.current
    return () => map.forEach((t) => clearTimeout(t))
  }, [])

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss])
  const rank = [...toasts].sort((a, b) => a.id - b.id).map((t) => t.id)

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          ref={stack}
          onFocus={(e) => {
            // Remember where focus came from, to hand it back when the last note goes.
            if (!stack.current.contains(e.relatedTarget))
              returnTo.current = e.relatedTarget
          }}
          className="pointer-events-none fixed inset-x-4 bottom-clear-bars z-toast flex flex-col sm:inset-x-auto sm:right-6 sm:w-84"
        >
          {SLOTS.map((slot) => {
            const t = toasts.find((x) => x.slot === slot)
            return (
              <StickyNote
                key={slot}
                toast={t}
                order={t ? ORDER[rank.indexOf(t.id)] : undefined}
                onDismiss={() => t && dismissByUser(t.id)}
                onPause={() => t && pause(t.id)}
                onResume={() => t && schedule(t.id, RESUME_MS)}
              />
            )
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

/** One slot. Empty, it is a zero-size live region waiting for a message. */
function StickyNote({ toast, order, onDismiss, onPause, onResume }) {
  return (
    <div
      data-toast={toast?.id}
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onFocus={onPause}
      onBlur={onResume}
      className={cn(
        toast &&
          'pointer-events-auto relative mt-5 flex -rotate-1 items-start gap-2 border border-paper-400 bg-tab-butter py-4 pr-1 pl-4 shadow-stack motion-reduce:rotate-0',
        order,
      )}
    >
      {/* Tape strip. Decorative. */}
      {toast && (
        <span
          aria-hidden="true"
          className="absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 rotate-2 border border-paper-300 bg-paper-50/75"
        />
      )}
      {/* The note is a course-tab colour in both modes, so its text and focus ring use on-mark. */}
      <div role="status" aria-live="polite" className="flex-1">
        {toast && <p className="pt-1.5 text-on-mark">{toast.message}</p>}
      </div>
      {toast && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="grid size-11 shrink-0 place-items-center rounded-paper text-on-mark transition-paper hover:bg-on-mark/10 focus-visible:outline-on-mark"
        >
          <X strokeWidth={1.5} aria-hidden="true" className="size-4.5" />
        </button>
      )}
    </div>
  )
}
