import { useState } from 'react'
import { Stamp } from '@/components/annotate/Stamp'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'
import { sentence, shareOfAsking, shortDate } from './ledger'

function toCents(value) {
  const n = Number.parseFloat(String(value).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

/** One received offer as a note to answer: Accept, Counter (inline amount), Decline kept apart. */
export function OfferNote({
  offer,
  askingCents,
  canAccept = true,
  busy,
  onAccept,
  onDecline,
  onCounter,
}) {
  const [countering, setCountering] = useState(false)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const buyer = offer.buyer?.name ?? 'A buyer'
  const pending = offer.status === 'pending'
  const declined = offer.status === 'declined' || offer.status === 'withdrawn'

  function startCounter() {
    // Suggest the whole-dollar midpoint between their offer and your asking price.
    const mid = Math.ceil((offer.amountCents + askingCents) / 200) * 100
    setAmount(String(mid / 100))
    setError('')
    setCountering(true)
  }

  function submitCounter(e) {
    e.preventDefault()
    const cents = toCents(amount)
    if (!cents || cents <= offer.amountCents || cents >= askingCents) {
      setError(
        `Pick an amount between ${formatPrice(offer.amountCents)} and ${formatPrice(askingCents)}.`,
      )
      return
    }
    setCountering(false)
    onCounter(offer, cents)
  }

  let statusText = ''
  if (offer.status === 'countered')
    statusText = sentence(
      `You countered at ${formatPrice(offer.counterCents)}. Waiting on ${buyer}`,
    )
  if (offer.status === 'accepted')
    statusText = `Meet ${buyer} at your pickup spot, then mark it sold.`
  if (offer.status === 'withdrawn') statusText = `${buyer} withdrew this offer.`

  return (
    <article
      aria-label={`Offer of ${formatPrice(offer.amountCents)} from ${buyer}`}
      className={cn(
        'flex flex-col gap-3 rounded-paper border border-paper-400 p-4 shadow-stack sm:p-5',
        declined ? 'bg-paper-100' : 'bg-paper-50',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-baseline gap-x-2.5">
            <span
              className={cn(
                'font-serif text-h2 leading-tight font-semibold tabular-nums',
                declined ? 'text-ink-500' : 'text-pen-600',
              )}
            >
              {formatPrice(offer.amountCents)}
            </span>
            <span className={cn(declined && 'text-ink-500')}>from {buyer}</span>
          </p>
          <p className="text-small text-ink-500">
            {shareOfAsking(offer.amountCents, askingCents)}, {shortDate(offer.createdAt)}
          </p>
        </div>
        {!pending && <Stamp status={offer.status} />}
      </div>

      {offer.message && (
        <blockquote
          className={cn(
            'border-l border-dotted border-graphite pl-3 font-serif leading-relaxed',
            declined && 'text-ink-500',
          )}
        >
          {offer.message}
        </blockquote>
      )}

      {statusText && <p className="text-ink-700">{statusText}</p>}

      {pending && !countering && (
        <div className="mt-1 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Once the listing is reserved (another offer accepted) only Decline makes sense (a countered offer could not be accepted either). */}
          {canAccept && (
            <Button
              onClick={() => onAccept(offer)}
              disabled={busy}
              size="lg"
              className="w-full sm:w-auto"
            >
              Accept
            </Button>
          )}
          {canAccept && (
            <Button
              variant="outline"
              onClick={startCounter}
              disabled={busy}
              size="lg"
              className="w-full sm:w-auto"
            >
              Counter
            </Button>
          )}
          {/* Decline sits apart (a rule on phones, pushed right on wider screens) to avoid mis-taps. */}
          <div className="mt-1.5 border-t border-paper-300 pt-1.5 sm:mt-0 sm:ml-auto sm:border-0 sm:pt-0">
            <Button
              variant="redpen"
              onClick={() => onDecline(offer)}
              disabled={busy}
              className="w-full sm:w-auto"
            >
              Decline
            </Button>
          </div>
        </div>
      )}

      {pending && countering && (
        <form
          onSubmit={submitCounter}
          noValidate
          className="flex flex-col gap-3 border-t border-paper-300 pt-3"
        >
          <TextField
            label="Your counter, $"
            hint={`Between their ${formatPrice(offer.amountCents)} and your ${formatPrice(askingCents)} asking.`}
            error={error}
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value.replace(/[^0-9.]/g, ''))
              setError('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setCountering(false)
            }}
            className="sm:max-w-48"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" size="lg" disabled={busy}>
              Send counter
            </Button>
            <Button variant="ghost" size="lg" onClick={() => setCountering(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </article>
  )
}
