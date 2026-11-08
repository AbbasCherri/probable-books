import {
  MAX_DESCRIPTION,
  MAX_NOTE_LENGTH,
  TITLE_MAX,
  TITLE_MIN,
  toCents,
} from './listingForm'

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

/** ISBN-10 or ISBN-13 with a valid check digit. Spaces and hyphens are ignored. */
export function isValidIsbn(raw) {
  const s = String(raw).replace(/[\s-]/g, '').toUpperCase()
  if (/^\d{9}[\dX]$/.test(s)) {
    let sum = 0
    for (let i = 0; i < 10; i += 1) sum += (s[i] === 'X' ? 10 : Number(s[i])) * (10 - i)
    return sum % 11 === 0
  }
  if (/^\d{13}$/.test(s)) {
    let sum = 0
    for (let i = 0; i < 13; i += 1) sum += Number(s[i]) * (i % 2 === 0 ? 1 : 3)
    return sum % 10 === 0
  }
  return false
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

  if (form.photos.length === 0)
    e.photos = 'Add at least one photo. The first one is the cover.'

  const price = toCents(form.price)
  if (!price || price <= 0) e.price = 'Enter an asking price above $0.'

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
