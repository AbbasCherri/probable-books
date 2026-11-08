import { useId, useState } from 'react'
import { Field } from '@/components/ui/Field'
import { controlClass, describedBy } from '@/components/ui/fieldStyles'

/**
 * Password input with a show/hide toggle. Other props (autoComplete, value, onChange, ref...)
 * go to the <input>. Register will add the strength meter to this component.
 */
export function PasswordField({ id, label, hint, error, className, ...props }) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const [visible, setVisible] = useState(false)

  return (
    <Field id={fieldId} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        <input
          id={fieldId}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          {...props}
          aria-describedby={describedBy(fieldId, {
            hint,
            error,
            extra: props['aria-describedby'],
          })}
          className={controlClass(error, 'min-h-12 py-2 pr-20')}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex min-w-16 items-center justify-center px-3 font-medium text-pen-600 hover:text-pen-700"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </Field>
  )
}
