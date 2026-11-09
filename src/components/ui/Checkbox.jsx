import { useId } from 'react'
import { cn } from '@/lib/cn'
import { FieldError } from './FieldError'
import { describedBy } from './fieldStyles'

/**
 * A native checkbox with its label, an optional hint and error (section 9: every input has a
 * visible label). The label wraps the box, so the whole 44px row toggles it.
 *   <Checkbox label="Open to offers" hint="Buyers can offer less." checked={on}
 *             onChange={(e) => setOn(e.target.checked)} />
 * One accent across the app: ink-900, the primary button fill (it flips to paper at night).
 * className styles the wrapper; other props go to the <input>.
 */
export function Checkbox({ id, label, hint, error, className, ...props }) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      <label
        htmlFor={fieldId}
        className="flex min-h-11 cursor-pointer items-start gap-3 py-2.5 text-ink-900"
      >
        <input
          id={fieldId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          {...props}
          aria-describedby={describedBy(fieldId, {
            hint,
            error,
            extra: props['aria-describedby'],
          })}
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-ink-900 disabled:cursor-default"
        />
        <span className="min-w-0">{label}</span>
      </label>
      {/* Outside the label, so the hint describes the box instead of joining its name. */}
      {hint && (
        <p id={`${fieldId}-hint`} className="-mt-2 pb-1 pl-8 text-small text-ink-500">
          {hint}
        </p>
      )}
      <FieldError id={`${fieldId}-error`} className="pl-8">
        {error}
      </FieldError>
    </div>
  )
}
