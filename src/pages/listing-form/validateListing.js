import {
  MAX_DESCRIPTION,
  MAX_NOTE_LENGTH,
  MAX_PHOTOS,
  MAX_PRICE_CENTS,
  MIN_PHOTOS,
  TITLE_MAX,
  TITLE_MIN,
  isValidIsbn,
} from '@/lib/listingRules'
import { formatPrice } from '@/lib/format'
import { toCents } from './listingForm'

export { isValidIsbn }

// Field order matches the page, so the error summary reads top to bottom.
const ORDER = [
  'title',
  'isbn',
  'courseCodes',
  'condition',
  'conditionNotes',
  'photos',
  'price',
  'retail',
  'description',
  'pickupSpot',
]

// Where each error-summary link sends focus.
export const FIELD_IDS = {
  title: 'listing-title',
  isbn: 'listing-isbn',
  courseCodes: 'listing-courses',
  condition: 'listing-condition-new',
  conditionNotes: 'listing-notes-add',
  photos: 'listing-photos',
  price: 'listing-price',
  retail: 'listing-retail',
  description: 'listing-description',
  pickupSpot: 'listing-pickup',
}

/** Returns { field: message } for every problem. Messages say how to fix it. */
export function validateListing(form) {
  const e = {}
  const title = form.title.trim()

  if (!title) e.title = 'Add a title, as it reads on the cover or the box.'
  else if (title.length < TITLE_MIN)
    e.title = `Make the title at least ${TITLE_MIN} characters.`
  else if (title.length > TITLE_MAX)
    e.title = `Keep the title under ${TITLE_MAX} characters.`

  if (form.category === 'textbook' && form.isbn.trim() && !isValidIsbn(form.isbn)) {
    e.isbn =
      "That ISBN doesn't check out. Copy the 10 or 13 digits from the back cover, or leave it empty."
  }

  if (form.courseCodes.length === 0)
    e.courseCodes = 'Add at least one course, like CHEM 201.'

  if (!form.condition) e.condition = 'Choose the condition.'

  if (form.conditionNotes.some((n) => n.text.trim().length > MAX_NOTE_LENGTH)) {
    e.conditionNotes = `Keep each condition note under ${MAX_NOTE_LENGTH} characters.`
  }

  if (form.photos.length < MIN_PHOTOS)
    e.photos = 'Add at least one photo. The first one is the cover.'
  else if (form.photos.length > MAX_PHOTOS)
    e.photos = `Add up to ${MAX_PHOTOS} photos. The first one is the cover.`

  const price = toCents(form.price)
  if (!price || price <= 0) e.price = 'Enter an asking price above $0.'
  else if (price > MAX_PRICE_CENTS)
    e.price = `Keep the asking price at or under ${formatPrice(MAX_PRICE_CENTS)}.`

  if (form.retail.trim()) {
    const retail = toCents(form.retail)
    if (!retail) e.retail = 'Enter the retail price as a number, or leave it empty.'
    else if (price && retail <= price)
      e.retail =
        "Retail should be more than your asking price. Leave it empty if you're not sure."
  }

  if (form.description.length > MAX_DESCRIPTION) {
    e.description = `Trim the description to ${MAX_DESCRIPTION.toLocaleString('en-US')} characters.`
  }

  if (!form.pickupSpot) e.pickupSpot = "Choose where you'll meet buyers."

  return e
}

/** Errors as an ordered list for the error summary. */
export function errorList(errors) {
  return ORDER.filter((f) => errors[f]).map((f) => ({
    field: f,
    id: FIELD_IDS[f],
    message: errors[f],
  }))
}
