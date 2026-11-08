// The only module pages talk to. Today it reads seed data with a simulated delay;
// later the same signatures will call the real backend.
import { CONDITIONS, PAGE_SIZE, PICKUP_SPOTS } from '@/lib/constants'
import { normalizeCode } from '@/lib/courses'
import { readJSON, writeJSON, removeKey } from '@/lib/storage'
import { buildSeed } from './mock'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const SESSION_KEY = 'pb.session'
const db = buildSeed()
const seedCourses = db.courses

const delay = () => new Promise((r) => setTimeout(r, 250 + Math.random() * 350))
const publicUser = ({ password: _p, ...u }) => u
const clone = (x) => structuredClone(x)

function currentUserId() {
  return readJSON(SESSION_KEY)?.userId ?? null
}
function requireUser() {
  const id = currentUserId()
  if (!id) throw new ApiError(401, 'Sign in to continue.')
  return id
}
const withSeller = (l) => ({
  ...clone(l),
  seller: publicUser(db.users.find((u) => u.id === l.sellerId)),
})
const visible = (l) => l.status !== 'draft'

// ---------- listings ----------
export async function getListings(filters = {}) {
  await delay()
  const {
    q,
    courses = [],
    categories = [],
    conditions = [],
    minPrice,
    maxPrice,
    openToOffers,
    sort = 'newest',
    page = 1,
    pageSize = PAGE_SIZE,
  } = filters
  const needle = q?.trim().toLowerCase()
  let items = db.listings.filter(visible).filter((l) => {
    if (
      needle &&
      ![l.title, l.author, l.isbn, l.brand, l.model].some((f) =>
        f?.toLowerCase().includes(needle),
      )
    )
      return false
    if (courses.length && !l.courseCodes.some((c) => courses.includes(c))) return false
    if (categories.length && !categories.includes(l.category)) return false
    if (conditions.length && !conditions.includes(l.condition)) return false
    if (minPrice !== undefined && l.priceCents < minPrice) return false
    if (maxPrice !== undefined && l.priceCents > maxPrice) return false
    if (openToOffers && !l.openToOffers) return false
    return true
  })
  const sorters = {
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    price_asc: (a, b) => a.priceCents - b.priceCents,
    price_desc: (a, b) => b.priceCents - a.priceCents,
    condition: (a, b) => CONDITIONS[a.condition].rank - CONDITIONS[b.condition].rank,
  }
  items = items.sort(sorters[sort] ?? sorters.newest)
  const total = items.length
  return {
    items: clone(items.slice((page - 1) * pageSize, page * pageSize)),
    total,
    page,
    pageSize,
  }
}

export async function getFeaturedListings() {
  await delay()
  return clone(db.listings.filter((l) => l.featured && l.status === 'active').slice(0, 5))
}

export async function getNewListings(limit = 10) {
  await delay()
  return clone(
    db.listings
      .filter((l) => l.status === 'active')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit),
  )
}

export async function getListing(id) {
  await delay()
  const l = db.listings.find((x) => x.id === id)
  if (!l) throw new ApiError(404, 'This page was torn out.')
  return withSeller(l)
}

function validateListing(data) {
  const errors = []
  if (!data.title || data.title.length < 5 || data.title.length > 120)
    errors.push('Title must be 5 to 120 characters.')
  if (!data.courseCodes?.length || data.courseCodes.length > 5)
    errors.push('Add 1 to 5 courses.')
  if (!data.condition || !CONDITIONS[data.condition]) errors.push('Choose the condition.')
  if (!Number.isInteger(data.priceCents) || data.priceCents <= 0)
    errors.push('Enter an asking price above $0.')
  if ((data.description ?? '').length > 1000)
    errors.push('Description is limited to 1,000 characters.')
  if (data.pickupSpot && !PICKUP_SPOTS.includes(data.pickupSpot))
    errors.push('Choose a campus pickup spot.')
  if (errors.length) throw new ApiError(422, errors.join(' '))
}

export async function createListing(data) {
  await delay()
  const sellerId = requireUser()
  validateListing(data)
  const now = new Date().toISOString()
  const listing = {
    author: null,
    edition: null,
    isbn: null,
    brand: null,
    model: null,
    conditionNotes: [],
    description: '',
    retailCents: null,
    openToOffers: true,
    photos: [],
    pickupSpot: PICKUP_SPOTS[0],
    featured: false,
    ...data,
    id: `lst_${Date.now().toString(36)}`,
    sellerId,
    status: data.status ?? 'active',
    createdAt: now,
    updatedAt: now,
  }
  db.listings.unshift(listing)
  return clone(listing)
}

export async function updateListing(id, data) {
  await delay()
  const userId = requireUser()
  const i = db.listings.findIndex((l) => l.id === id)
  if (i < 0) throw new ApiError(404, 'This page was torn out.')
  if (db.listings[i].sellerId !== userId)
    throw new ApiError(401, 'That listing is not yours.')
  const next = {
    ...db.listings[i],
    ...data,
    id,
    sellerId: userId,
    updatedAt: new Date().toISOString(),
  }
  if (data.status === undefined || data.status === 'active') validateListing(next)
  db.listings[i] = next
  return clone(next)
}

export async function deleteListing(id) {
  await delay()
  const userId = requireUser()
  const l = db.listings.find((x) => x.id === id)
  if (!l) throw new ApiError(404, 'This page was torn out.')
  if (l.sellerId !== userId) throw new ApiError(401, 'That listing is not yours.')
  db.listings = db.listings.filter((x) => x.id !== id)
  db.offers = db.offers.filter((o) => o.listingId !== id)
}

export async function getMyListings() {
  await delay()
  const userId = requireUser()
  return db.listings
    .filter((l) => l.sellerId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((l) => ({
      ...clone(l),
      offerCount: db.offers.filter((o) => o.listingId === l.id && o.status === 'pending')
        .length,
    }))
}

// ---------- courses ----------
export async function getCourses() {
  await delay()
  return seedCourses.map((c) => ({
    ...clone(c),
    listingCount: db.listings.filter(
      (l) => l.status === 'active' && l.courseCodes.includes(c.code),
    ).length,
  }))
}

export async function getCourse(code) {
  await delay()
  const norm = normalizeCode(code)
  const course = seedCourses.find((c) => c.code === norm)
  if (!course) {
    const near = norm
      ? seedCourses.filter((c) => c.department === norm.split(' ')[0]).map((c) => c.code)
      : []
    const err = new ApiError(404, `No ${norm ?? code} in the index.`)
    err.closest = near.length ? near : seedCourses.slice(0, 3).map((c) => c.code)
    throw err
  }
  const prices = db.listings
    .filter((l) => l.status === 'active' && l.courseCodes.includes(course.code))
    .map((l) => l.priceCents)
    .sort((a, b) => a - b)
  const median = prices.length
    ? prices.length % 2
      ? prices[(prices.length - 1) / 2]
      : Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2)
    : null
  return {
    ...clone(course),
    stats: {
      listingCount: prices.length,
      minCents: prices[0] ?? null,
      medianCents: median,
    },
  }
}

// ---------- offers ----------
export async function makeOffer(listingId, { amountCents, message = '' }) {
  await delay()
  const buyerId = requireUser()
  const l = db.listings.find((x) => x.id === listingId)
  if (!l) throw new ApiError(404, 'This page was torn out.')
  if (l.status === 'sold') throw new ApiError(422, 'This listing is sold.')
  if (l.sellerId === buyerId)
    throw new ApiError(422, 'You cannot make an offer on your own listing.')
  if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > l.priceCents)
    throw new ApiError(422, 'Enter an amount above $0 and at most the asking price.')
  const offer = {
    id: `off_${Date.now().toString(36)}`,
    listingId,
    buyerId,
    amountCents,
    message,
    status: 'pending',
    counterCents: null,
    createdAt: new Date().toISOString(),
  }
  db.offers.unshift(offer)
  return clone(offer)
}

export async function getOffers({ direction = 'received' } = {}) {
  await delay()
  const userId = requireUser()
  const mine = new Set(db.listings.filter((l) => l.sellerId === userId).map((l) => l.id))
  const rows = db.offers.filter((o) =>
    direction === 'received' ? mine.has(o.listingId) : o.buyerId === userId,
  )
  return rows.map((o) => {
    const l = db.listings.find((x) => x.id === o.listingId)
    return {
      ...clone(o),
      listing: l && { id: l.id, title: l.title, priceCents: l.priceCents },
      buyer: publicUser(db.users.find((u) => u.id === o.buyerId)),
    }
  })
}

export async function respondToOffer(id, action, counterCents) {
  await delay()
  const userId = requireUser()
  const o = db.offers.find((x) => x.id === id)
  if (!o) throw new ApiError(404, 'Offer not found.')
  const l = db.listings.find((x) => x.id === o.listingId)
  const isSeller = l?.sellerId === userId
  if (action === 'withdraw') {
    if (o.buyerId !== userId) throw new ApiError(401, 'That offer is not yours.')
    o.status = 'withdrawn'
  } else {
    if (!isSeller) throw new ApiError(401, 'That listing is not yours.')
    if (action === 'accept') {
      o.status = 'accepted'
      l.status = 'reserved'
    } else if (action === 'decline') o.status = 'declined'
    else if (action === 'counter') {
      if (!Number.isInteger(counterCents) || counterCents <= 0)
        throw new ApiError(422, 'Enter a counter amount above $0.')
      o.status = 'countered'
      o.counterCents = counterCents
    } else throw new ApiError(422, 'Unknown action.')
  }
  return clone(o)
}

// ---------- auth ----------
export async function login(email, password) {
  await delay()
  const u = db.users.find(
    (x) =>
      x.email.toLowerCase() === String(email).trim().toLowerCase() &&
      x.password === password,
  )
  if (!u) throw new ApiError(401, "That email and password don't match.")
  writeJSON(SESSION_KEY, { userId: u.id })
  return publicUser(u)
}

export async function register({ name, email, password, yearOfStudy }) {
  await delay()
  if (db.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase()))
    throw new ApiError(422, 'That email already has a card. Sign in instead.')
  const u = {
    id: `usr_${Date.now().toString(36)}`,
    name,
    email,
    password,
    memberSince: new Date().toISOString(),
    yearOfStudy: yearOfStudy || undefined,
  }
  db.users.push(u)
  writeJSON(SESSION_KEY, { userId: u.id })
  return publicUser(u)
}

export async function logout() {
  await delay()
  removeKey(SESSION_KEY)
}

export async function getCurrentUser() {
  await delay()
  const id = currentUserId()
  const u = id && db.users.find((x) => x.id === id)
  return u ? publicUser(u) : null
}
