import { CircleAlert } from 'lucide-react'

/** Red-pen error line for the custom fields (combobox, grades, photos). TextField has its own. */
export function FieldError({ id, children }) {
  if (!children) return null
  return (
    <p id={id} className="flex items-start gap-1.5 text-small text-redpen-600">
      <CircleAlert
        strokeWidth={1.5}
        aria-hidden="true"
        className="mt-0.5 size-4.5 shrink-0"
      />
      <span>{children}</span>
    </p>
  )
}
