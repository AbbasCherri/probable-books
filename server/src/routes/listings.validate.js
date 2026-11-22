// Owner: Youssef (@yousefelezzi)
// Listing validation shared by POST /listings and PATCH /listings/:id.
// Limits come from requirements A5 and every message is copied verbatim from A8: forms show
// them next to the field, so the wording is part of the contract.

export const CATEGORIES = ['textbook', 'calculator', 'lab_gear', 'other']
export const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'worn']
export const STATUSES = ['draft', 'active', 'reserved', 'sold']
export const PICKUP_SPOTS = [
  'Science building lobby',
  'Main library entrance',
  'Student union café',
  'Engineering quad',
  'Bookstore steps',
]
export const DEFAULT_PICKUP_SPOT = 'Science building lobby'

export const LIMITS = {
  titleMin: 5,
  titleMax: 120,
  courses: 5,
  notes: 5,
  noteLength: 80,
  photos: 6,
  description: 1000,
  priceMax: 500_000,
}

export const MESSAGES = {
  titleMissing: 'Add a title, as it reads on the cover or the box.',
  titleShort: 'Make the title at least 5 characters.',
  titleLong: 'Keep the title under 120 characters.',
  category: 'Choose a category.',
  status: 'Status must be draft, active, reserved or sold.',
  statusOnCreate: 'New listings start as a draft or active.',
  coursesNone: 'Add at least one course, like CHEM 201.',
  coursesMany: 'Tag up to 5 courses.',
  courseFormat: 'Course codes look like CHEM 201.',
  courseUnknown: (code) => `No ${code} in the index. Pick a course from the list.`,
  condition: 'Choose the condition.',
  notesMany: 'Add up to 5 condition notes.',
  noteLong: 'Keep each condition note under 80 characters.',
  notesType: 'Condition notes must be short lines of text.',
  photosMany: 'Add up to 6 photos.',
  photoUrl: 'Each photo needs a url.',
  priceLow: 'Enter an asking price above $0.',
  priceHigh: 'Keep the asking price at or under $5,000.',
  retailType: 'Enter the retail price as a number, or leave it empty.',
  retailLow:
    "Retail should be more than your asking price. Leave it empty if you're not sure.",
  description: 'Trim the description to 1,000 characters.',
  isbn: "That ISBN doesn't check out. Copy the 10 or 13 digits from the back cover, or leave it empty.",
  openToOffers: 'Open to offers must be yes or no.',
  pickupSpot: "Choose where you'll meet buyers.",
}

/** Every property a client may send. Anything else (id, sellerId, featured, dates) is ignored. */
export const WRITABLE = [
  'title',
  'category',
  'courseCodes',
  'author',
  'edition',
  'isbn',
  'brand',
  'model',
  'condition',
  'conditionNotes',
  'description',
  'priceCents',
  'retailCents',
  'openToOffers',
  'photos',
  'pickupSpot',
  'status',
]

const COURSE_INPUT = /^\s*([A-Za-z]{2,4})[\s-]*(\d{3})\s*$/

/** chem201, CHEM-201, Chem 201 -> "CHEM 201". Returns null when the shape is wrong. */
export function normalizeCourseCode(raw) {
  if (typeof raw !== 'string') return null
  const m = COURSE_INPUT.exec(raw)
  return m ? `${m[1].toUpperCase()} ${m[2]}` : null
}

/**
 * Strip spaces and hyphens, then verify the check digit.
 * ISBN-10: weights 10..1, sum divisible by 11 (last digit may be X = 10).
 * ISBN-13: weights alternate 1 and 3, sum divisible by 10.
 * Returns the digits-only form, or null when it does not check out.
 */
export function normalizeIsbn(raw) {
  if (typeof raw !== 'string') return null
  const s = raw.replace(/[\s-]/g, '').toUpperCase()
  if (/^\d{9}[\dX]$/.test(s)) {
    let sum = 0
    for (let i = 0; i < 10; i += 1) {
      const d = s[i] === 'X' ? 10 : Number(s[i])
      sum += d * (10 - i)
    }
    return sum % 11 === 0 ? s : null
  }
  if (/^\d{13}$/.test(s)) {
    let sum = 0
    for (let i = 0; i < 13; i += 1) sum += Number(s[i]) * (i % 2 === 0 ? 1 : 3)
    return sum % 10 === 0 ? s : null
  }
  return null
}

const isWhole = (v) => typeof v === 'number' && Number.isInteger(v)
/** Absent for "required unless draft" purposes: not sent, null, or blank text. */
const isAbsent = (v) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
/** Optional free text: trimmed, blank or non-text becomes null. */
const optionalText = (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null)
// Same rule the database enforces (listing_photos.url): http(s) or a site-relative path.
const PHOTO_URL = /^(https?:\/\/|\/[^/])/

/**
 * Validate a complete listing as it would be stored.
 *
 * `input` holds every writable property (for PATCH: the current listing with the changes laid
 * over it). Draft rules apply only when the resulting status is draft: required fields may then
 * be absent, but anything present must still be valid.
 *
 * `courseExists(codes)` resolves to the subset of normalized codes found in the course index.
 *
 * Returns { values, fields }: normalized values ready to store, and one message per bad field
 * (the first problem found for that field). `fields` is empty when the listing is valid.
 */
export async function validateListing(input, { create, courseExists }) {
  const fields = {}
  const values = {}

  // ---- status first: it decides whether draft rules apply ----
  let status = input.status
  if (status === undefined || status === null) status = create ? 'active' : status
  if (!STATUSES.includes(status)) {
    fields.status = MESSAGES.status
  } else if (create && (status === 'reserved' || status === 'sold')) {
    fields.status = MESSAGES.statusOnCreate
  }
  values.status = status
  const draft = status === 'draft'
  const need = (v) => !draft && isAbsent(v)

  // ---- title ----
  if (isAbsent(input.title)) {
    if (need(input.title)) fields.title = MESSAGES.titleMissing
    values.title = null
  } else if (typeof input.title !== 'string') {
    fields.title = MESSAGES.titleMissing
  } else {
    const t = input.title.trim()
    if (t.length < LIMITS.titleMin) fields.title = MESSAGES.titleShort
    else if (t.length > LIMITS.titleMax) fields.title = MESSAGES.titleLong
    values.title = t
  }

  // ---- category ----
  if (isAbsent(input.category)) {
    if (need(input.category)) fields.category = MESSAGES.category
    values.category = null
  } else if (!CATEGORIES.includes(input.category)) {
    fields.category = MESSAGES.category
  } else values.category = input.category

  // ---- course codes: count, then shape, then existence ----
  const rawCodes = input.courseCodes ?? []
  values.courseCodes = []
  if (!Array.isArray(rawCodes)) {
    fields.courseCodes = MESSAGES.courseFormat
  } else {
    const codes = []
    let badShape = false
    for (const raw of rawCodes) {
      const code = normalizeCourseCode(raw)
      if (!code) badShape = true
      else if (!codes.includes(code)) codes.push(code) // duplicates removed
    }
    if (badShape) fields.courseCodes = MESSAGES.courseFormat
    else if (codes.length > LIMITS.courses) fields.courseCodes = MESSAGES.coursesMany
    else if (codes.length === 0 && !draft) fields.courseCodes = MESSAGES.coursesNone
    else if (codes.length > 0) {
      const known = new Set(await courseExists(codes))
      const unknown = codes.find((c) => !known.has(c))
      if (unknown) fields.courseCodes = MESSAGES.courseUnknown(unknown)
    }
    values.courseCodes = codes
  }

  // ---- free text ----
  for (const key of ['author', 'edition', 'brand', 'model'])
    values[key] = optionalText(input[key])

  // ---- isbn ----
  if (isAbsent(input.isbn)) values.isbn = null
  else {
    values.isbn = normalizeIsbn(input.isbn)
    if (!values.isbn) fields.isbn = MESSAGES.isbn
  }

  // ---- condition ----
  if (isAbsent(input.condition)) {
    if (need(input.condition)) fields.condition = MESSAGES.condition
    values.condition = null
  } else if (!CONDITIONS.includes(input.condition)) {
    fields.condition = MESSAGES.condition
  } else values.condition = input.condition

  // ---- condition notes: blank lines are dropped ----
  const notes = input.conditionNotes ?? []
  if (!Array.isArray(notes) || notes.some((n) => typeof n !== 'string')) {
    fields.conditionNotes = MESSAGES.notesType
    values.conditionNotes = []
  } else {
    const kept = notes.map((n) => n.trim()).filter(Boolean)
    if (kept.length > LIMITS.notes) fields.conditionNotes = MESSAGES.notesMany
    else if (kept.some((n) => n.length > LIMITS.noteLength)) {
      fields.conditionNotes = MESSAGES.noteLong
    }
    values.conditionNotes = kept
  }

  // ---- description ----
  const desc = input.description ?? ''
  if (typeof desc !== 'string' || desc.length > LIMITS.description) {
    fields.description = MESSAGES.description
  }
  values.description = typeof desc === 'string' ? desc : ''

  // ---- asking price ----
  const price = input.priceCents
  if (price === undefined || price === null) {
    if (!draft) fields.priceCents = MESSAGES.priceLow
    values.priceCents = null
  } else if (!isWhole(price) || price < 1) {
    fields.priceCents = MESSAGES.priceLow
  } else if (price > LIMITS.priceMax) {
    fields.priceCents = MESSAGES.priceHigh
  } else values.priceCents = price

  // ---- retail price: optional, must beat the asking price ----
  const retail = input.retailCents
  if (retail === undefined || retail === null) values.retailCents = null
  else if (!isWhole(retail) || retail < 1) fields.retailCents = MESSAGES.retailType
  else {
    if (isWhole(values.priceCents) && retail <= values.priceCents) {
      fields.retailCents = MESSAGES.retailLow
    }
    values.retailCents = retail
  }

  // ---- open to offers ----
  const open = input.openToOffers ?? true
  if (typeof open !== 'boolean') fields.openToOffers = MESSAGES.openToOffers
  values.openToOffers = open === true

  // ---- photos ----
  const photos = input.photos ?? []
  values.photos = []
  if (!Array.isArray(photos)) fields.photos = MESSAGES.photoUrl
  else if (photos.length > LIMITS.photos) fields.photos = MESSAGES.photosMany
  else {
    for (const p of photos) {
      const url =
        p && typeof p === 'object' && typeof p.url === 'string' ? p.url.trim() : ''
      if (!PHOTO_URL.test(url)) {
        fields.photos = MESSAGES.photoUrl
        break
      }
      values.photos.push({ url, alt: typeof p.alt === 'string' ? p.alt : '' })
    }
  }

  // ---- pickup spot (create fills in the default before calling us) ----
  if (isAbsent(input.pickupSpot)) {
    if (need(input.pickupSpot)) fields.pickupSpot = MESSAGES.pickupSpot
    values.pickupSpot = null
  } else if (!PICKUP_SPOTS.includes(input.pickupSpot)) {
    fields.pickupSpot = MESSAGES.pickupSpot
  } else values.pickupSpot = input.pickupSpot

  return { values, fields: ordered(fields) }
}

/** Keep `fields` in form order so the joined message reads top to bottom. */
function ordered(fields) {
  const out = {}
  for (const key of WRITABLE) if (fields[key]) out[key] = fields[key]
  return out
}
