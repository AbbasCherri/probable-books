// Form state for the sell form, and conversion to and from the API's Listing shape.
// Money stays as typed text in the form and becomes integer cents only at the edges.

export const MAX_COURSES = 5
export const MAX_NOTES = 5
export const MAX_NOTE_LENGTH = 80
export const MAX_PHOTOS = 6
export const MAX_DESCRIPTION = 1000
export const TITLE_MIN = 5
export const TITLE_MAX = 120

let keySeq = 0
/** Stable React key for rows that can be added and removed (notes, photos). */
export function newKey(prefix = 'k') {
  keySeq += 1
  return `${prefix}_${Date.now().toString(36)}_${keySeq}`
}

export const EMPTY_FORM = {
  category: 'textbook',
  title: '',
  author: '',
  edition: '',
  isbn: '',
  brand: '',
  model: '',
  courseCodes: [],
  condition: '',
  conditionNotes: [], // [{ key, text }]
  photos: [], // [{ key, url, alt, file? }]
  price: '',
  retail: '',
  openToOffers: true,
  description: '',
  pickupSpot: '',
}

/** "45" or "45.50" -> 4500. Empty or invalid -> null. */
export function toCents(value) {
  const clean = String(value ?? '').replace(/[^0-9.]/g, '')
  if (!clean) return null
  const n = Number.parseFloat(clean)
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

/** 4500 -> "45", 4550 -> "45.50". */
export function centsToInput(cents) {
  if (cents == null) return ''
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2)
}

/** URL form "CHEM-201" -> display form "CHEM 201". Returns null if it isn't a course code. */
export function courseFromSlug(slug) {
  const m = String(slug ?? '')
    .trim()
    .toUpperCase()
    .match(/^([A-Z]{2,4})[\s-]?(\d{3})$/)
  return m ? `${m[1]} ${m[2]}` : null
}

export function hasBrandFields(category) {
  return category === 'calculator' || category === 'lab_gear'
}

/** Listing from the API -> form values (edit mode). */
export function formFromListing(listing) {
  return {
    ...EMPTY_FORM,
    category: listing.category ?? 'textbook',
    title: listing.title ?? '',
    author: listing.author ?? '',
    edition: listing.edition ?? '',
    isbn: listing.isbn ?? '',
    brand: listing.brand ?? '',
    model: listing.model ?? '',
    courseCodes: listing.courseCodes ?? [],
    condition: listing.condition ?? '',
    conditionNotes: (listing.conditionNotes ?? []).map((text) => ({
      key: newKey('note'),
      text,
    })),
    photos: (listing.photos ?? []).map((p) => ({
      key: newKey('photo'),
      url: p.url,
      alt: p.alt ?? '',
    })),
    price: centsToInput(listing.priceCents),
    retail: centsToInput(listing.retailCents),
    openToOffers: listing.openToOffers ?? true,
    description: listing.description ?? '',
    pickupSpot: listing.pickupSpot ?? '',
  }
}

/** Form values -> data for createListing / updateListing. Fields that don't apply to the category are dropped. */
export function listingFromForm(form) {
  const title = form.title.trim()
  const isTextbook = form.category === 'textbook'
  const brandy = hasBrandFields(form.category)
  return {
    title,
    category: form.category,
    courseCodes: form.courseCodes,
    author: isTextbook ? form.author.trim() || null : null,
    edition: isTextbook ? form.edition.trim() || null : null,
    isbn: isTextbook ? form.isbn.replace(/[\s-]/g, '') || null : null,
    brand: brandy ? form.brand.trim() || null : null,
    model: brandy ? form.model.trim() || null : null,
    condition: form.condition,
    conditionNotes: form.conditionNotes.map((n) => n.text.trim()).filter(Boolean),
    description: form.description.trim(),
    priceCents: toCents(form.price),
    retailCents: form.retail.trim() ? toCents(form.retail) : null,
    openToOffers: form.openToOffers,
    photos: form.photos.map((p, i) => ({
      url: p.url,
      alt: p.alt || `${title}, photo ${i + 1} of ${form.photos.length}`,
    })),
    pickupSpot: form.pickupSpot,
  }
}

/** What ListingCard needs to draw the live "How buyers see it" preview. */
export function previewFromForm(form, { listingId, sellerId } = {}) {
  const data = listingFromForm(form)
  const now = new Date().toISOString()
  return {
    ...data,
    id: listingId ?? 'preview',
    title: data.title || 'Your title shows here',
    priceCents: data.priceCents ?? 0,
    sellerId,
    status: 'active',
    featured: false,
    createdAt: now,
    updatedAt: now,
  }
}
