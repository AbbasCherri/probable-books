import { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { Field } from './Field'
import { controlClass, describedBy } from './fieldStyles'

/**
 * Native <select> with label, hint and error. Pass <option>s as children.
 *   <SelectField label="Sort" value={sort} onChange={...}>{SORTS.map(...)}</SelectField>
 */
export function SelectField({
  id,
  label,
  hint,
  error,
  optional,
  className,
  inputClassName,
  children,
  ...props
}) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <Field
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      className={className}
    >
      <div className="relative">
        <select
          id={fieldId}
          aria-invalid={error ? true : undefined}
          {...props}
          aria-describedby={describedBy(fieldId, {
            hint,
            error,
            extra: props['aria-describedby'],
          })}
          className={controlClass(error, [
            'min-h-12 cursor-pointer appearance-none py-2 pr-10',
            inputClassName,
          ])}
        >
          {children}
        </select>
        <ChevronDown
          size={18}
          strokeWidth={1.5}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-700"
        />
      </div>
    </Field>
  )
}
