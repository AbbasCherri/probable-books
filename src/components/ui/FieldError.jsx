import { CircleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * The one red-pen error line (section 9: errors say how to fix the problem). Field renders it
 * for TextField, TextArea and SelectField; custom controls (comboboxes, radio cards, uploads)
 * render it themselves and point aria-describedby at its id.
 *   <FieldError id="listing-condition-error">{errors.condition}</FieldError>
 * Renders nothing when there is no message.
 */
export function FieldError({ id, className, children }) {
  if (!children) return null
  return (
    <p
      id={id}
      data-field-error=""
      className={cn('flex items-start gap-1.5 text-small text-redpen-600', className)}
    >
      <CircleAlert
        strokeWidth={1.5}
        aria-hidden="true"
        className="mt-0.5 size-4.5 shrink-0"
      />
      <span>{children}</span>
    </p>
  )
}
