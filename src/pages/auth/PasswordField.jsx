import { useId, useState } from 'react'
import { Field } from '@/components/ui/Field'
import { controlClass, describedBy } from '@/components/ui/fieldStyles'
import { cn } from '@/lib/cn'

const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  'qwerty123',
  'qwertyui',
  'iloveyou',
  'letmein1',
])

// Strength in words, so colour is never the only signal. Level 0 is an empty field.
function rateStrength(password) {
  if (!password) return { level: 0, label: 'Use at least 8 characters.' }
  if (password.length < 8)
    return { level: 1, label: 'Too short. Use at least 8 characters.' }
  if (COMMON_PASSWORDS.has(password.toLowerCase()))
    return { level: 1, label: 'Too common. Try something less predictable.' }
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) =>
    re.test(password),
  ).length
  if (password.length >= 12 && kinds >= 3) return { level: 4, label: 'Strong.' }
  if (password.length >= 12 || kinds >= 3)
    return { level: 3, label: 'Strong enough. Longer is even better.' }
  return { level: 2, label: 'Weak. Add numbers or symbols, or make it longer.' }
}

/**
 * Password input with a show/hide toggle and an optional strength meter.
 * Other props (autoComplete, value, onChange, ref...) go to the <input>.
 * showStrength needs a controlled `value`. The meter text is announced politely; the bars are
 * decoration (aria-hidden), so the words carry the meaning.
 */
export function PasswordField({
  id,
  label,
  hint,
  error,
  showStrength = false,
  className,
  ...props
}) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const strengthId = `${fieldId}-strength`
  const [visible, setVisible] = useState(false)
  const strength = showStrength ? rateStrength(String(props.value ?? '')) : null

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
            extra:
              [showStrength && strengthId, props['aria-describedby']]
                .filter(Boolean)
                .join(' ') || undefined,
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

      {strength && (
        <>
          <div aria-hidden="true" className="flex gap-1">
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                className={cn(
                  'h-1 flex-1 rounded-paper',
                  n <= strength.level ? 'bg-ink-900' : 'bg-paper-300',
                )}
              />
            ))}
          </div>
          <p id={strengthId} role="status" className="text-sm text-ink-500">
            {strength.label}
          </p>
        </>
      )}
    </Field>
  )
}
