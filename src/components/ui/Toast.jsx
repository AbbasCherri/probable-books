import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { ToastContext } from '@/context/ToastContext'

const SHOW_MS = 5000
const RESUME_MS = 3000
const MAX_VISIBLE = 3

let nextId = 0

/**
 * Sticky-note toasts (section 4). Mount once, in RootLayout, around <Outlet />,
 * so a toast survives navigation (the sell form navigates to the new listing
 * and the toast shows there).
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

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
      setToasts((list) => [...list.slice(-(MAX_VISIBLE - 1)), { id, message }])
      schedule(id, SHOW_MS)
      return id
    },
    [schedule],
  )

  useEffect(() => {
    const map = timers.current
    return () => map.forEach((t) => clearTimeout(t))
  }, [])

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Always in the DOM so screen readers announce new toasts. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex flex-col gap-5 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-84"
      >
        {toasts.map((t) => (
          <StickyNote
            key={t.id}
            message={t.message}
            onDismiss={() => dismiss(t.id)}
            onPause={() => pause(t.id)}
            onResume={() => schedule(t.id, RESUME_MS)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function StickyNote({ message, onDismiss, onPause, onResume }) {
  return (
    <div
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onFocus={onPause}
      onBlur={onResume}
      className="pointer-events-auto relative flex -rotate-1 items-start gap-2 border border-paper-400 bg-tab-butter py-4 pr-1 pl-4 shadow-stack motion-reduce:rotate-0"
    >
      {/* Tape strip. Decorative. */}
      <span
        aria-hidden="true"
        className="absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 rotate-2 border border-paper-300 bg-paper-50/75"
      />
      <p className="flex-1 pt-1.5 font-medium">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="grid size-11 shrink-0 place-items-center rounded-paper text-ink-900 transition-colors duration-150 ease-out hover:bg-paper-50/60"
      >
        <X size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  )
}
