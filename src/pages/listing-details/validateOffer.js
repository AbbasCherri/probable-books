import { formatPrice } from '@/lib/format'
import { MAX_OFFER_MESSAGE } from '@/lib/listingRules'

export { MAX_OFFER_MESSAGE }

/** "10", "$10.5", ".50", "1,200" -> integer cents. Anything else (3 decimals, words) -> null. */
export function parseOfferAmount(text) {
  const s = String(text ?? '')
    .trim()
    .replace(/^\$\s*/, '')
    .replace(/,/g, '')
  if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(s)) return null
  return Math.round(Number.parseFloat(s) * 100)
}

/**
 * Client-side checks for Make an offer, matching makeOffer() in the API (doc 5.3):
 * an amount above $0 and at most the asking price, in dollars and cents, and an optional
 * message of at most 280 characters. Returns { amount?, message? }.
 */
export function validateOffer({ amount, message }, askingCents) {
  const errors = {}
  if (!String(amount ?? '').trim()) {
    errors.amount = 'Enter your offer in dollars, like 10.'
  } else {
    const cents = parseOfferAmount(amount)
    if (cents == null) errors.amount = 'Enter dollars and cents, like 10 or 9.50.'
    else if (cents <= 0) errors.amount = 'Enter an amount above $0.'
    else if (cents > askingCents)
      errors.amount = `Offer at most the asking price, ${formatPrice(askingCents)}.`
  }
  const over = String(message ?? '').trim().length - MAX_OFFER_MESSAGE
  if (over > 0)
    errors.message = `Keep the message to ${MAX_OFFER_MESSAGE} characters. Cut ${over}.`
  return errors
}
