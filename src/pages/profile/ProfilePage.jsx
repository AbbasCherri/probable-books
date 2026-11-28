import { useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { pageTitleClass } from '@/components/layout/pageTitle'
import { Button } from '@/components/ui/Button'
import { SelectField } from '@/components/ui/SelectField'
import { TextField } from '@/components/ui/TextField'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'
import { PICKUP_SPOTS } from '@/lib/constants'

const YEARS = [
  { value: '1', label: 'First year' },
  { value: '2', label: 'Second year' },
  { value: '3', label: 'Third year' },
  { value: '4', label: 'Fourth year' },
  { value: '5', label: 'Graduate' },
]

/** Your own details: name, year of study and usual pickup spot. The email can't change. */
export default function ProfilePage() {
  useDocumentTitle('Your profile')
  const { user, updateProfile } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(user?.name ?? '')
  const [year, setYear] = useState(user?.yearOfStudy ? String(user.yearOfStudy) : '')
  const [spot, setSpot] = useState(user?.usualPickupSpot ?? '')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const changed =
    name.trim() !== (user?.name ?? '') ||
    year !== (user?.yearOfStudy ? String(user.yearOfStudy) : '') ||
    spot !== (user?.usualPickupSpot ?? '')

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving) return
    const next = name.trim().length >= 2 ? {} : { name: 'Enter your full name.' }
    setErrors(next)
    setFormError('')
    if (next.name) return
    setSaving(true)
    try {
      await updateProfile({
        name: name.trim(),
        yearOfStudy: year ? Number(year) : null,
        usualPickupSpot: spot || null,
      })
      toast('Profile saved.')
    } catch (err) {
      if (err?.status === 422 && err.fields) setErrors(err.fields)
      else setFormError(err?.message || 'Something went wrong. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell chapter="Your profile" title={null}>
      <div className="pt-6 sm:pt-8">
        <div className="max-w-form paper-card">
          <div className="flex items-baseline justify-between bg-ink-900 px-4 py-2.5 text-paper-50 sm:px-6">
            <span className="font-semibold">Probable Books</span>
            <span className="font-serif text-small italic">Borrower’s card</span>
          </div>
          <form
            noValidate
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 ruled px-4 py-6 sm:px-6"
          >
            <h1 className={pageTitleClass}>Your profile</h1>
            <TextField
              label="Full name"
              autoComplete="name"
              value={name}
              error={errors.name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label="University email"
              value={user?.email ?? ''}
              readOnly
              hint="Your email can't be changed."
            />
            <SelectField
              label="Year of study"
              optional
              value={year}
              error={errors.yearOfStudy}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="">Prefer not to say</option>
              {YEARS.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Usual pickup spot"
              optional
              value={spot}
              error={errors.usualPickupSpot}
              onChange={(e) => setSpot(e.target.value)}
            >
              <option value="">No usual spot</option>
              {PICKUP_SPOTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </SelectField>
            {formError && (
              <p role="alert" className="text-small text-redpen-600">
                {formError}
              </p>
            )}
            <Button type="submit" size="lg" disabled={saving || !changed}>
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </div>
      </div>
    </PageShell>
  )
}
