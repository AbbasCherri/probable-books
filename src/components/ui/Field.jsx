import { CircleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Label, hint and error around one control. TextField, TextArea and SelectField use it. */
export function Field({ id, label, hint, error, optional, className, children }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="font-semibold text-ink-900">
        {label}
        {optional && <span className="font-normal text-ink-500"> optional</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-small text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          className="flex items-start gap-1.5 text-small text-redpen-600"
        >
          <CircleAlert
            strokeWidth={1.5}
            aria-hidden="true"
            className="mt-0.5 size-4.5 shrink-0"
          />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
