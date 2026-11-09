import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  Navigate,
  useBlocker,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router'
import { Check, Trash2 } from 'lucide-react'
import { MarginNote } from '@/components/annotate/MarginNote'
import { PageShell } from '@/components/layout/PageShell'
import { SectionHeading } from '@/components/layout/SectionHeading'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { SelectField } from '@/components/ui/SelectField'
import { Sheet } from '@/components/ui/Sheet'
import { TextArea } from '@/components/ui/TextArea'
import { TextField } from '@/components/ui/TextField'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'
import { PICKUP_SPOTS } from '@/lib/constants'
import * as api from '@/services/api'
import { CategoryPicker } from './CategoryPicker'
import { ConditionNotes } from './ConditionNotes'
import { CourseCombobox } from './CourseCombobox'
import { ErrorSummary } from './ErrorSummary'
import { GradePicker } from './GradePicker'
import { ListingPreview } from './ListingPreview'
import { PhotoUploader } from './PhotoUploader'
import { clearDraft, readDraft, useDraftAutosave, writeDraft } from './draft'
import {
  EMPTY_FORM,
  MAX_COURSES,
  MAX_DESCRIPTION,
  TITLE_MAX,
  courseFromSlug,
  formFromListing,
  hasBrandFields,
  listingFromForm,
  previewFromForm,
} from './listingForm'
import { usePriceHint } from './usePriceHint'
import { errorList, validateListing } from './validateListing'

const FORM_ID = 'listing-form'

/**
 * 5.5 Create / Edit Listing: /sell and /listings/:listingId/edit (behind RequireAuth).
 * Loads what the form needs, then hands over to <ListingForm>.
 */
export default function ListingFormPage() {
  const { listingId } = useParams()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const isEdit = Boolean(listingId)
  useDocumentTitle(isEdit ? 'Edit listing' : 'Sell something')

  const courses = useAsync(() => api.getCourses(), [])
  const existing = useAsync(
    () => (listingId ? api.getListing(listingId) : Promise.resolve(null)),
    [listingId],
  )

  if (isEdit) {
    if (existing.error) {
      return (
        <PageShell chapter="Index card, editing" title="This page was torn out">
          <p className="mt-2 max-w-xl text-ink-700">
            {existing.error.status === 404
              ? 'There is no listing with that ID.'
              : "The listing didn't load."}{' '}
            <Link to="/dashboard" className="text-pen-600 underline underline-offset-3">
              Back to your ledger
            </Link>
          </p>
        </PageShell>
      )
    }
    if (!existing.data) {
      return (
        <PageShell chapter="Index card, editing" title="Edit listing">
          <p role="status" className="mt-2 text-ink-500">
            Opening the index card…
          </p>
        </PageShell>
      )
    }
    // Editing someone else's listing sends you to the listing instead.
    if (existing.data.sellerId !== user?.id)
      return <Navigate to={`/listings/${listingId}`} replace />
    return (
      <ListingForm
        key={listingId}
        mode="edit"
        listingId={listingId}
        initialForm={formFromListing(existing.data)}
        courses={courses.data ?? []}
        coursesLoading={!courses.data && !courses.error}
        userId={user?.id}
      />
    )
  }

  return (
    <ListingForm
      key="new"
      mode="create"
      prefillCourse={courseFromSlug(params.get('course'))}
      courses={courses.data ?? []}
      coursesLoading={!courses.data && !courses.error}
      userId={user?.id}
    />
  )
}

function startingForm({ mode, initialForm, prefillCourse }) {
  if (mode === 'edit') return { form: initialForm, restored: false }
  const draft = readDraft()
  let form = draft ? { ...EMPTY_FORM, ...draft, photos: [] } : { ...EMPTY_FORM }
  if (
    prefillCourse &&
    !form.courseCodes.includes(prefillCourse) &&
    form.courseCodes.length < MAX_COURSES
  ) {
    form = { ...form, courseCodes: [...form.courseCodes, prefillCourse] }
  }
  return { form, restored: Boolean(draft) }
}

function ListingForm({
  mode,
  listingId,
  initialForm,
  prefillCourse,
  courses,
  coursesLoading,
  userId,
}) {
  const isEdit = mode === 'edit'
  const navigate = useNavigate()
  const toast = useToast()

  const [start] = useState(() => startingForm({ mode, initialForm, prefillCourse }))
  const [createdAt] = useState(() => new Date().toISOString())
  const [form, setForm] = useState(start.form)
  const [touched, setTouched] = useState({})
  const [attempts, setAttempts] = useState(0) // failed submits; drives the error summary
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const summaryRef = useRef(null)
  const leaving = useRef(false) // set just before we navigate away on purpose

  const errors = useMemo(() => validateListing(form), [form])
  const summary = attempts > 0 ? errorList(errors) : []
  const errorFor = (field) => (attempts > 0 || touched[field] ? errors[field] : undefined)

  const draftStatus = useDraftAutosave(form, !isEdit && dirty)
  const priceHint = usePriceHint(form.courseCodes[0], form.category, listingId)
  const preview = useMemo(
    () => ({ ...previewFromForm(form, { listingId, sellerId: userId }), createdAt }),
    [form, listingId, userId, createdAt],
  )

  // Ask before leaving with unsaved changes (React Router data router).
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname,
  )

  // And before closing the tab: photos aren't kept in the draft.
  useEffect(() => {
    if (!dirty) return undefined
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  // After a failed submit, focus the error summary so the count is read out.
  useEffect(() => {
    if (attempts > 0) summaryRef.current?.focus()
  }, [attempts])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setDirty(true)
  }

  const touch = (field) => () =>
    setTouched((t) => (t[field] ? t : { ...t, [field]: true }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (saving) return
    if (errorList(errors).length) {
      setAttempts((n) => n + 1)
      return
    }
    setSaving(true)
    setSubmitError('')
    try {
      const data = listingFromForm(form)
      const saved = isEdit
        ? await api.updateListing(listingId, data)
        : await api.createListing(data)
      if (!isEdit) clearDraft()
      leaving.current = true
      toast(
        isEdit
          ? 'Saved. Buyers see the changes now.'
          : 'Listed. Good luck with the sale.',
      )
      navigate(`/listings/${saved?.id ?? listingId}`)
    } catch (err) {
      setSubmitError(
        err?.message || "That didn't save. Check your connection and try again.",
      )
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.deleteListing(listingId)
      leaving.current = true
      toast('Listing deleted.')
      navigate('/dashboard')
    } catch (err) {
      setDeleting(false)
      setConfirmDelete(false)
      setSubmitError(err?.message || "That didn't delete. Try again.")
    }
  }

  function handleSaveDraft() {
    toast(
      writeDraft(form)
        ? "Draft saved on this device. Photos aren't kept in drafts."
        : "This browser won't save drafts.",
    )
  }

  const verb = isEdit ? 'save' : 'publish'
  const primaryLabel = isEdit ? 'Save changes' : 'Publish listing'
  const draftNote = isEdit
    ? dirty && 'Unsaved changes'
    : draftStatus === 'saved'
      ? 'Draft saved'
      : draftStatus === 'failed'
        ? "This browser won't save drafts"
        : start.restored && 'Draft restored from this device'

  return (
    <PageShell
      chapter={isEdit ? 'Index card, editing' : 'Index card'}
      title={isEdit ? 'Edit listing' : 'Sell something'}
      margin={
        <div className="hidden lg:sticky lg:top-6 lg:block">
          <ListingPreview listing={preview} hint={priceHint} />
        </div>
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="max-w-xl text-ink-700">
          {isEdit
            ? 'Changes show on your listing as soon as you save them.'
            : 'Six short steps, about two minutes. Your draft saves as you go.'}
        </p>
        <p
          role="status"
          className="flex min-h-6 items-center gap-1.5 text-small text-ink-500"
        >
          {draftStatus === 'saved' && !isEdit && (
            <Check strokeWidth={1.5} aria-hidden="true" className="size-4" />
          )}
          {draftNote || ''}
        </p>
      </div>

      {summary.length > 0 && (
        <ErrorSummary errors={summary} verb={verb} focusRef={summaryRef} />
      )}

      <form
        id={FORM_ID}
        noValidate
        onSubmit={handleSubmit}
        className="mt-10 flex max-w-2xl flex-col gap-12 pb-28 lg:pb-0"
      >
        {/* §1 What are you selling */}
        <section className="flex flex-col gap-5">
          <SectionHeading number={1} title="What are you selling" size="md" />
          <CategoryPicker value={form.category} onChange={(v) => update('category', v)} />
          <TextField
            id="listing-title"
            label="Title"
            hint="What's printed on the cover or the box."
            value={form.title}
            maxLength={TITLE_MAX}
            autoComplete="off"
            onChange={(e) => update('title', e.target.value)}
            onBlur={touch('title')}
            error={errorFor('title')}
          />
          {form.category === 'textbook' && (
            <div className="grid grid-cols-5 gap-4 sm:grid-cols-12">
              <TextField
                className="col-span-5 sm:col-span-6"
                id="listing-author"
                label="Author"
                value={form.author}
                autoComplete="off"
                onChange={(e) => update('author', e.target.value)}
              />
              <TextField
                className="col-span-2"
                id="listing-edition"
                label="Edition"
                placeholder="4th"
                value={form.edition}
                autoComplete="off"
                onChange={(e) => update('edition', e.target.value)}
              />
              <TextField
                className="col-span-3 sm:col-span-4"
                id="listing-isbn"
                label="ISBN, optional"
                placeholder="10 or 13 digits"
                inputMode="numeric"
                autoComplete="off"
                value={form.isbn}
                onChange={(e) => update('isbn', e.target.value)}
                onBlur={touch('isbn')}
                error={errorFor('isbn')}
              />
            </div>
          )}
          {hasBrandFields(form.category) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="listing-brand"
                label="Brand"
                placeholder={
                  form.category === 'calculator'
                    ? 'e.g. Texas Instruments'
                    : 'e.g. Lab Safety Supply'
                }
                value={form.brand}
                autoComplete="off"
                onChange={(e) => update('brand', e.target.value)}
              />
              <TextField
                id="listing-model"
                label={form.category === 'calculator' ? 'Model' : 'Size or model'}
                placeholder={
                  form.category === 'calculator' ? 'e.g. TI-84 Plus CE' : 'e.g. Size M'
                }
                value={form.model}
                autoComplete="off"
                onChange={(e) => update('model', e.target.value)}
              />
            </div>
          )}
        </section>

        {/* §2 Courses */}
        <section className="flex flex-col gap-5">
          <SectionHeading number={2} title="Courses" size="md" />
          <CourseCombobox
            id="listing-courses"
            value={form.courseCodes}
            onChange={(v) => update('courseCodes', v)}
            onBlur={touch('courseCodes')}
            courses={courses}
            loading={coursesLoading}
            error={errorFor('courseCodes')}
          />
          {/* Phones only: from lg the margin column holds the live preview instead. */}
          <div className="lg:hidden">
            <MarginNote>
              Used it in two courses? Add both. People search either one.
            </MarginNote>
          </div>
        </section>

        {/* §3 Condition */}
        <section className="flex flex-col gap-6">
          <SectionHeading number={3} title="Condition" size="md" />
          <GradePicker
            value={form.condition}
            onChange={(v) => update('condition', v)}
            error={errorFor('condition')}
          />
          <ConditionNotes
            notes={form.conditionNotes}
            onChange={(v) => update('conditionNotes', v)}
            error={errorFor('conditionNotes')}
          />
        </section>

        {/* §4 Photos */}
        <section className="flex flex-col gap-5">
          <SectionHeading number={4} title="Photos" size="md" />
          <PhotoUploader
            id="listing-photos"
            photos={form.photos}
            onChange={(v) => {
              update('photos', v)
              setTouched((t) => ({ ...t, photos: true }))
            }}
            error={errorFor('photos')}
          />
        </section>

        {/* §5 Price */}
        <section className="flex flex-col gap-5">
          <SectionHeading number={5} title="Price" size="md" />
          <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
            <TextField
              id="listing-price"
              label="Asking price, $"
              inputMode="decimal"
              placeholder="45"
              autoComplete="off"
              value={form.price}
              onChange={(e) => update('price', e.target.value.replace(/[^0-9.]/g, ''))}
              onBlur={touch('price')}
              error={errorFor('price')}
            />
            <TextField
              id="listing-retail"
              label="Retail price, $ (optional)"
              hint="New, at the bookstore. Shows buyers what they save."
              inputMode="decimal"
              autoComplete="off"
              value={form.retail}
              onChange={(e) => update('retail', e.target.value.replace(/[^0-9.]/g, ''))}
              onBlur={touch('retail')}
              error={errorFor('retail')}
            />
          </div>
          <label className="flex cursor-pointer items-start gap-3 py-1">
            <input
              type="checkbox"
              checked={form.openToOffers}
              onChange={(e) => update('openToOffers', e.target.checked)}
              className="mt-1 size-5 shrink-0 accent-ink-900"
            />
            <span>
              <span className="block font-semibold">Open to offers</span>
              <span className="block text-small text-ink-500">
                Buyers can offer less. You accept, counter or decline.
              </span>
            </span>
          </label>
          {priceHint && (
            <div className="lg:hidden">
              <MarginNote>{priceHint}</MarginNote>
            </div>
          )}
        </section>

        {/* §6 Description and pickup */}
        <section className="flex flex-col gap-5">
          <SectionHeading number={6} title="Description and pickup" size="md" />
          <TextArea
            id="listing-description"
            label="About this copy"
            hint={`What's included and anything a buyer should know. ${form.description.length.toLocaleString('en-US')} of ${MAX_DESCRIPTION.toLocaleString('en-US')} characters.`}
            rows={5}
            maxLength={MAX_DESCRIPTION}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            onBlur={touch('description')}
            error={errorFor('description')}
          />
          <SelectField
            id="listing-pickup"
            className="sm:max-w-sm"
            label="Pickup spot"
            hint="Where you'll meet buyers. Somewhere public on campus."
            value={form.pickupSpot}
            onChange={(e) => update('pickupSpot', e.target.value)}
            onBlur={touch('pickupSpot')}
            error={errorFor('pickupSpot')}
          >
            <option value="" disabled>
              Choose a spot
            </option>
            {PICKUP_SPOTS.map((spot) => (
              <option key={spot} value={spot}>
                {spot}
              </option>
            ))}
          </SelectField>
        </section>

        {submitError && (
          <p
            role="alert"
            className="rounded-paper border-2 border-redpen-600 bg-paper-50 px-4 py-3 text-redpen-600"
          >
            {submitError}
          </p>
        )}

        {/* Actions in the page flow. On phones Publish lives in the sticky bar below instead. */}
        <div className="flex flex-wrap items-center gap-3 border-t-3 border-double border-paper-300 pt-6">
          <div className="hidden lg:block">
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? 'Saving…' : primaryLabel}
            </Button>
          </div>
          {!isEdit && (
            <Button variant="outline" size="lg" onClick={handleSaveDraft}>
              Save draft
            </Button>
          )}
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigate(isEdit ? `/listings/${listingId}` : '/dashboard')}
            className="underline underline-offset-3"
          >
            Cancel
          </Button>
          {isEdit && (
            <Button
              variant="redpen"
              size="lg"
              onClick={() => setConfirmDelete(true)}
              className="ml-auto"
            >
              <Trash2 strokeWidth={1.5} aria-hidden="true" className="size-4.5" />
              Delete listing
            </Button>
          )}
        </div>
      </form>

      {/* Sticky bottom bar, phones and tablets: main action under the thumb. */}
      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-2.5 border-t border-paper-400 bg-paper-50 px-4 pt-3 pb-safe-3 lg:hidden">
        <Button
          variant="outline"
          size="lg"
          className="col-span-2"
          onClick={() => setPreviewOpen(true)}
        >
          Preview
        </Button>
        <Button
          type="submit"
          form={FORM_ID}
          size="lg"
          className="col-span-3"
          disabled={saving}
        >
          {saving ? 'Saving…' : primaryLabel}
        </Button>
      </div>

      <Sheet
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="How buyers see it"
      >
        <div className="mx-auto flex w-full max-w-xs flex-col gap-4 py-3">
          <ListingPreview listing={preview} hint={priceHint} />
        </div>
        <Button
          type="submit"
          form={FORM_ID}
          size="lg"
          className="mt-2 w-full"
          disabled={saving}
          onClick={() => setPreviewOpen(false)}
        >
          {primaryLabel}
        </Button>
      </Sheet>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this listing?"
      >
        <p className="mt-2 text-ink-700">
          “{form.title.trim() || 'This listing'}” comes off Probable Books, and anyone
          with a pending offer is told it’s gone. You can’t undo this.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(false)}>
            Keep listing
          </Button>
          <Button variant="redpen" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete listing'}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title={isEdit ? 'Discard your changes?' : 'Leave the sell form?'}
      >
        <p className="mt-2 text-ink-700">
          {isEdit
            ? 'The listing stays exactly as it was before you started editing.'
            : "Your draft stays on this device, so you can finish it later. Photos aren't kept."}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={() => blocker.reset?.()}>
            Keep editing
          </Button>
          <Button variant={isEdit ? 'redpen' : 'ink'} onClick={() => blocker.proceed?.()}>
            {isEdit ? 'Discard changes' : 'Leave'}
          </Button>
        </div>
      </Dialog>
    </PageShell>
  )
}
