import { CircleAlert } from 'lucide-react'

/** Red-pen error line for the custom fields (combobox, grades, photos). TextField has its own. */
export function FieldError({ id, children }) {
  if (!children) return null
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm font-medium text-redpen-600">
      <CircleAlert
        size={18}
        strokeWidth={1.5}
        aria-hidden="true"
        className="mt-0.5 shrink-0"
      />
      <span>{children}</span>
    </p>
  )
}
