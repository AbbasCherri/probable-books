import { cn } from '@/lib/cn'
import { FieldError } from './FieldError'

/** Label, hint and error around one control. TextField, TextArea and SelectField use it. */
export function Field({ id, label, hint, error, optional, className, children }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-ink-900">
        {label}
        {optional && <span className="font-normal text-ink-500"> optional</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-small text-ink-500">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  )
}
