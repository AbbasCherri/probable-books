import { useId } from 'react'
import { Field } from './Field'
import { controlClass, describedBy } from './fieldStyles'

/**
 * Text input with a visible label, helper text and an error tied by aria-describedby.
 *   <TextField label="Email" type="email" autoComplete="email" error={errors.email} />
 * className styles the wrapper; inputClassName styles the input. Other props go to the <input>.
 */
export function TextField({
  id,
  label,
  hint,
  error,
  optional,
  className,
  inputClassName,
  type = 'text',
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
      <input
        id={fieldId}
        type={type}
        aria-invalid={error ? true : undefined}
        {...props}
        aria-describedby={describedBy(fieldId, {
          hint,
          error,
          extra: props['aria-describedby'],
        })}
        className={controlClass(error, ['min-h-12 py-2', inputClassName])}
      />
    </Field>
  )
}
