// Listing limits and server-side validation (design doc section 6). The sell form and the
// API both read these, so the page and the "server" never disagree.
import { CATEGORIES, CONDITIONS, LISTING_STATUSES, PICKUP_SPOTS } from './constants'
import { normalizeCode } from './courses'

export const TITLE_MIN = 5
export const TITLE_MAX = 120
export const MIN_COURSES = 1
export const MAX_COURSES = 5
export const MAX_NOTES = 5
export const MAX_NOTE_LENGTH = 80
export const MIN_PHOTOS = 0
export const MAX_PHOTOS = 6
export const MAX_DESCRIPTION = 1000
export const MIN_PRICE_CENTS = 1
export const MAX_PRICE_CENTS = 500000
export const MAX_OFFER_MESSAGE = 280

/** ISBN-10 or ISBN-13 with a valid check digit. Spaces and hyphens are ignored. */
export function isValidIsbn(raw) {
  const s = String(raw ?? '')
    .replace(/[\s-]/g, '')
    .toUpperCase()
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

const money = (max) => `$${(max / 100).toLocaleString('en-US')}`
const isCents = (v) => Number.isInteger(v)
const present = (v) => v !== undefined && v !== null && v !== ''

/**
 * Checks listing data as the API receives it (Listing field names, integer cents).
 * Returns { field: message } for every problem; {} when it's fine. With { draft: true }
 * missing fields are allowed, but anything that is filled in must still be valid.
 */
export function validateListingInput(input = {}, { draft = false } = {}) {
  const e = {}
  const required = !draft

  const title = typeof input.title === 'string' ? input.title.trim() : input.title
  if (!present(title)) {
    if (required) e.title = 'Add a title, as it reads on the cover or the box.'
  } else if (typeof title !== 'string') e.title = 'The title must be text.'
  else if (title.length < TITLE_MIN)
    e.title = `Make the title at least ${TITLE_MIN} characters.`
  else if (title.length > TITLE_MAX)
    e.title = `Keep the title under ${TITLE_MAX} characters.`

  if (present(input.category) || required) {
    if (!Object.hasOwn(CATEGORIES, input.category ?? ''))
      e.category = 'Choose a category.'
  }

  if (present(input.status) && !Object.hasOwn(LISTING_STATUSES, input.status))
    e.status = 'Status must be draft, active, reserved or sold.'

  const codes = input.courseCodes ?? []
  if (!Array.isArray(codes)) e.courseCodes = 'Courses must be a list of codes.'
  else if (codes.length < MIN_COURSES && required)
    e.courseCodes = 'Add at least one course, like CHEM 201.'
  else if (codes.length > MAX_COURSES) e.courseCodes = `Tag up to ${MAX_COURSES} courses.`
  else if (codes.some((c) => normalizeCode(c) !== c))
    e.courseCodes = 'Course codes look like CHEM 201.'

  if (present(input.condition) || required) {
    if (!Object.hasOwn(CONDITIONS, input.condition ?? ''))
      e.condition = 'Choose the condition.'
  }

  const notes = input.conditionNotes ?? []
  if (!Array.isArray(notes) || notes.some((n) => typeof n !== 'string'))
    e.conditionNotes = 'Condition notes must be short lines of text.'
  else if (notes.length > MAX_NOTES)
    e.conditionNotes = `Add up to ${MAX_NOTES} condition notes.`
  else if (notes.some((n) => n.trim().length > MAX_NOTE_LENGTH))
    e.conditionNotes = `Keep each condition note under ${MAX_NOTE_LENGTH} characters.`

  const photos = input.photos ?? []
  if (!Array.isArray(photos) || photos.some((p) => !p || typeof p.url !== 'string'))
    e.photos = 'Each photo needs a url.'
  else if (photos.length < MIN_PHOTOS) e.photos = `Add at least ${MIN_PHOTOS} photos.`
  else if (photos.length > MAX_PHOTOS) e.photos = `Add up to ${MAX_PHOTOS} photos.`

  const price = input.priceCents
  if (!present(price)) {
    if (required) e.priceCents = 'Enter an asking price above $0.'
  } else if (!isCents(price) || price < MIN_PRICE_CENTS)
    e.priceCents = 'Enter an asking price above $0.'
  else if (price > MAX_PRICE_CENTS)
    e.priceCents = `Keep the asking price at or under ${money(MAX_PRICE_CENTS)}.`

  const retail = input.retailCents
  if (present(retail)) {
    if (!isCents(retail) || retail <= 0)
      e.retailCents = 'Enter the retail price as a number, or leave it empty.'
    else if (isCents(price) && retail <= price)
      e.retailCents =
        "Retail should be more than your asking price. Leave it empty if you're not sure."
  }

  if (present(input.description)) {
    if (typeof input.description !== 'string')
      e.description = 'The description must be text.'
    else if (input.description.length > MAX_DESCRIPTION)
      e.description = `Trim the description to ${MAX_DESCRIPTION.toLocaleString('en-US')} characters.`
  }

  if (present(input.isbn) && !isValidIsbn(input.isbn))
    e.isbn =
      "That ISBN doesn't check out. Copy the 10 or 13 digits from the back cover, or leave it empty."

  if (input.openToOffers !== undefined && typeof input.openToOffers !== 'boolean')
    e.openToOffers = 'Open to offers must be yes or no.'

  if (present(input.pickupSpot) || required) {
    if (!PICKUP_SPOTS.includes(input.pickupSpot))
      e.pickupSpot = "Choose where you'll meet buyers."
  }

  return e
}
