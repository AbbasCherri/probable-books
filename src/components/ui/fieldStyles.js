import { cn } from '@/lib/cn'

/** Classes for a text-like control. The 2px underline in ink-500 keeps input borders above 3:1. */
export function controlClass(error, extra) {
  return cn(
    'w-full rounded-paper border border-b-2 border-paper-400 px-3 text-body text-ink-900 transition-paper',
    'placeholder:text-ink-500 disabled:bg-paper-200 disabled:text-ink-500',
    error
      ? 'border-b-redpen-600 bg-redpen-50'
      : 'border-b-ink-500 bg-paper-50 hover:border-paper-400 hover:border-b-ink-700',
    extra,
  )
}

/** aria-describedby for a field: its hint, its error, and anything the caller passed. */
export function describedBy(id, { hint, error, extra } = {}) {
  return (
    [hint && `${id}-hint`, error && `${id}-error`, extra].filter(Boolean).join(' ') ||
    undefined
  )
}
