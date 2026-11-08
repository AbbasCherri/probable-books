import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { TextArea } from '@/components/ui/TextArea'
import { TextField } from '@/components/ui/TextField'
import { formatPrice, parsePriceToCents } from '@/lib/format'

const MESSAGE_MAX = 300

function validate(text, askingCents) {
  if (!text.trim()) return 'Enter an amount, like 40.'
  const cents = parsePriceToCents(text)
  if (cents == null || cents <= 0) return 'Enter an amount above $0.'
  if (cents > askingCents)
    return `Offer at most the asking price, ${formatPrice(askingCents)}.`
  return null
}

/**
 * Make an offer (section 5.3): amount and an optional message. Below sm it opens as a
 * bottom sheet with a number keypad. `onSubmit({ amountCents, message })` returns a promise;
 * a rejected one shows its message under the form.
 */
export function OfferDialog({ open, onClose, listing, onSubmit }) {
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [touched, setTouched] = useState(false)
  const [sending, setSending] = useState(false)
  const [failure, setFailure] = useState(null)
  const amountRef = useRef(null)
  const error = touched ? validate(amount, listing.priceCents) : null

  function close() {
    setTouched(false)
    setFailure(null)
    onClose()
  }

  async function submit(e) {
    e.preventDefault()
    setTouched(true)
    if (validate(amount, listing.priceCents)) {
      amountRef.current?.focus()
      return
    }
    setSending(true)
    setFailure(null)
    try {
      await onSubmit({ amountCents: parsePriceToCents(amount), message: message.trim() })
      setAmount('')
      setMessage('')
      setTouched(false)
    } catch (err) {
      setFailure(err.message ?? 'That offer did not go through. Try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onClose={close} title="Make an offer">
      <p className="text-small text-ink-500">
        Asking {formatPrice(listing.priceCents)}. The seller sees your offer in their
        ledger and can accept, counter or decline.
      </p>
      <form noValidate onSubmit={submit} className="mt-5 flex flex-col gap-5">
        <TextField
          label="Your offer, in dollars"
          inputMode="decimal"
          autoComplete="off"
          ref={amountRef}
          data-autofocus
          value={amount}
          placeholder={String(Math.round(listing.priceCents / 100))}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={() => setTouched(true)}
          error={error}
          inputClassName="min-h-14 font-serif text-h2 tabular-nums lining-nums"
        />
        <TextArea
          label="Message"
          optional
          rows={3}
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          hint={`When you can meet, for example. ${message.length} of ${MESSAGE_MAX} characters.`}
        />
        {failure && (
          <p role="alert" className="text-small font-medium text-redpen-600">
            {failure}
          </p>
        )}
        <Button type="submit" size="lg" disabled={sending} className="w-full">
          {sending ? 'Sending offer…' : 'Send offer'}
        </Button>
      </form>
    </Dialog>
  )
}
