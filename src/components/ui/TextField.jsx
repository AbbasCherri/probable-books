import { useId } from 'react'
import { Field } from './Field'
import { controlClass, describedBy } from './fieldStyles'

/**
 * Text input with a visible label, helper text and an error tied by aria-describedby.
 *   <TextField label="Email" type="email" autoComplete="email" error={errors.email} />
 * className styles the wrapper; inputClassName styles the input. Other props go to the <input>.
 *
 * endAdornment: a control inside the field's end edge, after the input in tab order, such as
 * a password field's Show button. Up to 5rem wide (the input keeps pr-20 clear for it). Pass a
 * function to get the input's id for aria-controls:
 *   <TextField label="Password" type={shown ? 'text' : 'password'}
 *     endAdornment={({ id }) => (
 *       <button type="button" aria-controls={id} aria-pressed={shown}
 *         className="min-h-11 min-w-16 px-3 text-pen-600" onClick={toggle}>Show</button>
 *     )} />
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
  endAdornment,
  ...props
}) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const adornment =
    typeof endAdornment === 'function' ? endAdornment({ id: fieldId }) : endAdornment
  const hasAdornment = adornment != null && adornment !== false
  const input = (
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
      className={controlClass(error, [
        'min-h-12 py-2',
        hasAdornment && 'pr-20',
        inputClassName,
      ])}
    />
  )
  return (
    <Field
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      className={className}
    >
      {hasAdornment ? (
        <div className="relative">
          {input}
          <div className="absolute inset-y-0 right-0 flex items-center pr-0.5">
            {adornment}
          </div>
        </div>
      ) : (
        input
      )}
    </Field>
  )
}
