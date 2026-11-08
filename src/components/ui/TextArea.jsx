import { useId } from 'react'
import { Field } from './Field'
import { controlClass, describedBy } from './fieldStyles'

/** Multi-line input in Literata reading type, for descriptions and messages. Same props as TextField. */
export function TextArea({
  id,
  label,
  hint,
  error,
  optional,
  className,
  inputClassName,
  rows = 4,
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
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        {...props}
        aria-describedby={describedBy(fieldId, {
          hint,
          error,
          extra: props['aria-describedby'],
        })}
        className={controlClass(error, [
          'resize-y py-2.5 font-serif text-reading',
          inputClassName,
        ])}
      />
    </Field>
  )
}
