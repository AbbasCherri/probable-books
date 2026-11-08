import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { TextArea } from '@/components/ui/TextArea'
import { TextField } from '@/components/ui/TextField'
import { formatPrice } from '@/lib/format'
import { MAX_OFFER_MESSAGE, parseOfferAmount, validateOffer } from './validateOffer'

const EMPTY = { amount: '', message: '' }
// API field names -> form field names.
const SERVER_FIELDS = { amountCents: 'amount', message: 'message' }

/**
 * Make an offer (doc 5.3): an amount (number keypad, dollars and cents, above $0 and at most
 * the asking price) and an optional message of up to 280 characters. Below sm the Dialog is a
 * bottom sheet.
 *   onSubmit({ amountCents, message }) -> Promise<Offer>; a rejected ApiError with `fields`
 *   marks those fields, any other error shows above the button.
 *   onSent(offer, { amountCents }) runs after a successful send; the page closes the dialog.
 */
export function OfferDialog({ open, onClose, listing, onSubmit, onSent }) {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [failure, setFailure] = useState(null)
  const [sending, setSending] = useState(false)
  const amountRef = useRef(null)
  const messageRef = useRef(null)
  const failureRef = useRef(null)

  function reset() {
    setValues(EMPTY)
    setErrors({})
    setSubmitted(false)
    setFailure(null)
  }

  function close() {
    if (sending) return
    reset()
    onClose()
  }

  function change(field, value) {
    const next = { ...values, [field]: value }
    setValues(next)
    // Once they have tried to send, errors follow the typing so they clear as soon as fixed.
    if (submitted) setErrors(validateOffer(next, listing.priceCents))
  }

  function focusFirst(errs) {
    if (errs.amount) amountRef.current?.focus()
    else if (errs.message) messageRef.current?.focus()
  }

  async function submit(e) {
    e.preventDefault()
    if (sending) return
    setSubmitted(true)
    setFailure(null)
    const errs = validateOffer(values, listing.priceCents)
    setErrors(errs)
    if (Object.keys(errs).length) {
      focusFirst(errs)
      return
    }
    const offer = {
      amountCents: parseOfferAmount(values.amount),
      message: values.message.trim(),
    }
    setSending(true)
    try {
      const sent = await onSubmit(offer)
      reset()
      onSent?.(sent, { amountCents: offer.amountCents })
    } catch (err) {
      const fieldErrors = {}
      for (const [api, field] of Object.entries(SERVER_FIELDS))
        if (err?.fields?.[api]) fieldErrors[field] = err.fields[api]
      if (Object.keys(fieldErrors).length) {
        setErrors(fieldErrors)
        focusFirst(fieldErrors)
      } else {
        setFailure(err?.message || 'That offer did not go through. Try again.')
        requestAnimationFrame(() => failureRef.current?.focus())
      }
    } finally {
      setSending(false)
    }
  }

  const count = values.message.length

  return (
    <Dialog open={open} onClose={close} title="Make an offer">
      <p className="text-small text-ink-700">
        Asking {formatPrice(listing.priceCents)}
        {listing.seller?.name ? ` from ${listing.seller.name}` : ''}. The seller sees your
        offer in their dashboard and can accept, counter or decline it.
      </p>
      <form noValidate onSubmit={submit} className="mt-5 flex flex-col gap-5 pb-1">
        <TextField
          ref={amountRef}
          label="Your offer, in dollars"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="send"
          data-autofocus
          value={values.amount}
          placeholder={String(Math.floor(listing.priceCents / 100) || '')}
          onChange={(e) => change('amount', e.target.value)}
          error={errors.amount}
          inputClassName="min-h-14 font-serif text-h2 lining-nums tabular-nums"
        />
        <TextArea
          ref={messageRef}
          label="Message"
          optional
          rows={3}
          value={values.message}
          onChange={(e) => change('message', e.target.value)}
          error={errors.message}
          hint={
            <>
              <span>When and where you can meet, say. </span>
              <span className={count > MAX_OFFER_MESSAGE ? 'text-redpen-600' : undefined}>
                {count} of {MAX_OFFER_MESSAGE} characters
              </span>
            </>
          }
        />
        {failure && (
          <p
            ref={failureRef}
            role="alert"
            tabIndex={-1}
            className="rounded-paper border border-redpen-600 bg-redpen-50 px-3 py-2 text-small font-semibold text-redpen-600 outline-none"
          >
            {failure}
          </p>
        )}
        <Button type="submit" size="lg" aria-disabled={sending || undefined} className="w-full">
          {sending ? 'Sending offer…' : 'Send offer'}
        </Button>
      </form>
    </Dialog>
  )
}
