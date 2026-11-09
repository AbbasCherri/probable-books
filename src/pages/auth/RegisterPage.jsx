import { useRef, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { Link, Navigate, useLocation } from 'react-router'
import { PageShell } from '@/components/layout/PageShell'
import { pageTitleClass } from '@/components/layout/pageTitle'
import { Button } from '@/components/ui/Button'
import { SelectField } from '@/components/ui/SelectField'
import { TextField } from '@/components/ui/TextField'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PasswordField } from '@/pages/auth/PasswordField'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const YEARS = [
  { value: '1', label: 'First year' },
  { value: '2', label: 'Second year' },
  { value: '3', label: 'Third year' },
  { value: '4', label: 'Fourth year' },
  { value: '5', label: 'Graduate' },
]

function validateName(value) {
  return value.trim().length >= 2 ? '' : 'Enter your full name.'
}

// The university-domain rule waits on the open decision in the design doc (section 1).
function validateEmail(value) {
  const v = value.trim()
  if (!v) return 'Enter your university email address.'
  if (!EMAIL_RE.test(v)) return 'Enter an email address like name@university.edu.'
  return ''
}

function validatePassword(value) {
  if (!value) return 'Choose a password.'
  if (value.length < 8) return 'Use at least 8 characters.'
  return ''
}

function validateTerms(accepted) {
  return accepted ? '' : 'Accept the terms to get a card.'
}

// Where to go after registering: the page that asked for it (router state.from), else the dashboard.
function destination(from) {
  if (!from) return '/dashboard'
  const path =
    typeof from === 'string'
      ? from
      : `${from.pathname ?? ''}${from.search ?? ''}${from.hash ?? ''}`
  return !path || path.startsWith('/register') ? '/dashboard' : path
}

export default function RegisterPage() {
  useDocumentTitle('Get a card')
  const { user, ready, register } = useAuth()
  const location = useLocation()
  const nameRef = useRef(null)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)
  const termsRef = useRef(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [year, setYear] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Already signed in, or just registered: leave the page.
  if (ready && user) {
    return <Navigate to={destination(location.state?.from)} replace />
  }

  const setError = (field, message) =>
    setErrors((prev) => ({ ...prev, [field]: message }))

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return

    const next = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      terms: validateTerms(accepted),
    }
    setErrors(next)
    setFormError('')
    if (next.name) return nameRef.current?.focus()
    if (next.email) return emailRef.current?.focus()
    if (next.password) return passwordRef.current?.focus()
    if (next.terms) return termsRef.current?.focus()

    setSubmitting(true)
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        yearOfStudy: year ? Number(year) : undefined,
      })
      // user is now set, so the redirect above takes over
    } catch (err) {
      setSubmitting(false)
      if (err?.status === 422) {
        // The mock API says when the email already has a card.
        setError('email', err.message)
        emailRef.current?.focus()
      } else {
        setFormError('Something went wrong. Try again.')
      }
    }
  }

  return (
    <PageShell chapter="Get a card" title={null}>
      <div className="pt-6 sm:pt-8">
        <div className="max-w-form paper-card">
          {/* Printed header row of the card application */}
          <div className="flex items-baseline justify-between bg-ink-900 px-4 py-2.5 text-paper-50 sm:px-6">
            <span className="font-semibold">Probable Books</span>
            <span className="font-serif text-small italic">Card application</span>
          </div>

          <form
            noValidate
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 ruled px-4 py-6 sm:px-6"
          >
            <h1 className={pageTitleClass}>Get a card</h1>

            <TextField
              ref={nameRef}
              label="Full name"
              autoComplete="name"
              value={name}
              error={errors.name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) setError('name', validateName(e.target.value))
              }}
              onBlur={(e) => setError('name', validateName(e.target.value))}
            />

            <TextField
              ref={emailRef}
              label="University email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              error={errors.email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setError('email', validateEmail(e.target.value))
              }}
              onBlur={(e) => setError('email', validateEmail(e.target.value))}
            />

            {/* No "confirm password" field: the Show toggle replaces it. */}
            <PasswordField
              ref={passwordRef}
              label="Password"
              autoComplete="new-password"
              showStrength
              value={password}
              error={errors.password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password)
                  setError('password', validatePassword(e.target.value))
              }}
              onBlur={(e) => setError('password', validatePassword(e.target.value))}
            />

            <SelectField
              label="Year of study"
              optional
              className="sm:max-w-56"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="">Choose a year</option>
              {YEARS.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </SelectField>

            <div className="flex flex-col gap-1.5">
              <label className="flex min-h-11 items-center gap-3">
                <input
                  ref={termsRef}
                  type="checkbox"
                  checked={accepted}
                  aria-invalid={errors.terms ? true : undefined}
                  aria-describedby={errors.terms ? 'terms-error' : undefined}
                  onChange={(e) => {
                    setAccepted(e.target.checked)
                    if (errors.terms) setError('terms', validateTerms(e.target.checked))
                  }}
                  className="size-5 accent-ink-900"
                />
                I accept the terms
              </label>
              {errors.terms && (
                <p
                  id="terms-error"
                  className="flex items-start gap-1.5 text-small text-redpen-600"
                >
                  <CircleAlert
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="mt-0.5 size-4.5 shrink-0"
                  />
                  <span>{errors.terms}</span>
                </p>
              )}
            </div>

            {formError && (
              <p
                role="alert"
                className="flex items-start gap-1.5 text-small text-redpen-600"
              >
                <CircleAlert
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="mt-0.5 size-4.5 shrink-0"
                />
                <span>{formError}</span>
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? 'Getting your card' : 'Get my card'}
            </Button>

            <p className="flex items-center gap-1.5">
              Have a card?
              <Link
                to="/login"
                state={location.state}
                className="inline-flex min-h-11 items-center"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </PageShell>
  )
}
