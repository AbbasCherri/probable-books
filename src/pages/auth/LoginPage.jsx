import { useRef, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { Link, Navigate, useLocation } from 'react-router'
import { MarginNote } from '@/components/annotate/MarginNote'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PasswordField } from '@/pages/auth/PasswordField'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MISMATCH = "That email and password don't match."

function validateEmail(value) {
  const v = value.trim()
  if (!v) return 'Enter your email address.'
  if (!EMAIL_RE.test(v)) return 'Enter an email address like name@university.edu.'
  return ''
}

function validatePassword(value) {
  return value ? '' : 'Enter your password.'
}

// Where to go after signing in: the page that asked for it (router state.from), else the dashboard.
function destination(from) {
  if (!from) return '/dashboard'
  const path =
    typeof from === 'string'
      ? from
      : `${from.pathname ?? ''}${from.search ?? ''}${from.hash ?? ''}`
  return !path || path.startsWith('/login') ? '/dashboard' : path
}

export default function LoginPage() {
  useDocumentTitle('Sign in')
  const { user, ready, login } = useAuth()
  const location = useLocation()
  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showResetNote, setShowResetNote] = useState(false)

  // Already signed in, or just signed in: leave the page.
  if (ready && user) {
    return <Navigate to={destination(location.state?.from)} replace />
  }

  const setError = (field, message) =>
    setErrors((prev) => ({ ...prev, [field]: message }))

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return

    const next = { email: validateEmail(email), password: validatePassword(password) }
    setErrors(next)
    setFormError('')
    if (next.email) return emailRef.current?.focus()
    if (next.password) return passwordRef.current?.focus()

    setSubmitting(true)
    try {
      await login(email.trim(), password)
      // user is now set, so the redirect above takes over
    } catch (err) {
      // One generic message: never say which field was wrong.
      setFormError(err?.status === 401 ? MISMATCH : 'Something went wrong. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <PageShell chapter="Sign in" title={null} annotated>
      <div className="pt-6 sm:pt-8">
        <div className="paper-card max-w-form hover:border-paper-400">
          {/* Printed header row of the borrower's card */}
          <div className="flex items-baseline justify-between bg-ink-900 px-4 py-2.5 text-paper-50 sm:px-6">
            <span className="font-semibold">Probable Books</span>
            <span className="font-serif text-sm italic">Borrower&rsquo;s card</span>
          </div>

          <form
            noValidate
            onSubmit={handleSubmit}
            className="ruled flex flex-col gap-5 px-4 py-6 sm:px-6"
          >
            <h1 className="font-serif">Sign in</h1>

            <TextField
              ref={emailRef}
              label="Email"
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

            <PasswordField
              ref={passwordRef}
              label="Password"
              autoComplete="current-password"
              value={password}
              error={errors.password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password)
                  setError('password', validatePassword(e.target.value))
              }}
              onBlur={(e) => setError('password', validatePassword(e.target.value))}
            />

            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-5 accent-ink-900"
              />
              Remember me
            </label>

            {formError && (
              <p
                role="alert"
                className="flex items-start gap-1.5 text-sm font-medium text-redpen-600"
              >
                <CircleAlert
                  size={18}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0"
                />
                <span>{formError}</span>
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in' : 'Sign in'}
            </Button>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowResetNote(true)}
                className="min-h-11 self-start text-pen-600 underline underline-offset-2 hover:text-pen-700"
              >
                Forgot password?
              </button>
              <p role="status" className="text-sm text-ink-500">
                {showResetNote && 'Password reset is not available yet.'}
              </p>
              <p className="flex items-center gap-1.5">
                New here?
                <Link
                  to="/register"
                  state={location.state}
                  className="inline-flex min-h-11 items-center"
                >
                  Get a card
                </Link>
              </p>
            </div>
          </form>
        </div>

        <MarginNote className="mt-6 lg:top-8 lg:mt-0">
          Sign in to make offers and sell.
        </MarginNote>
      </div>
    </PageShell>
  )
}
