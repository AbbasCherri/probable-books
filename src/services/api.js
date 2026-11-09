// The only module pages talk to. Today it reads seed data with a simulated delay;
// later the same signatures will call the real backend.
import { CONDITIONS, PAGE_SIZE, PICKUP_SPOTS } from '@/lib/constants'
import { normalizeCode } from '@/lib/courses'
import { MAX_OFFER_MESSAGE, validateListingInput } from '@/lib/listingRules'
import { readJSON, readString, writeJSON, removeKey } from '@/lib/storage'

export class ApiError extends Error {
  /** fields: optional { fieldName: message } for 422s, so forms can mark each input. */
  constructor(status, message, fields) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    if (fields) this.fields = fields
  }
}

const SESSION_KEY = 'pb.session'
// The mock database lives in memory and is saved to localStorage after every write.
// Bump DB_VERSION whenever the seed or the stored shape changes: stored data from an older
// version is thrown away and reseeded. (3 added seededAt.)
const DB_KEY = 'pb.db.v2'
const DB_VERSION = 3
// Seed rows keep their hand-picked ids (lst_001, off_012); rows people create get uuids.
const SEED_ID = /^(lst|off)_\d{3}$/
const DAY_MS = 86400000
// Dev controls, set in the browser console:
//   localStorage['pb.mock.latency'] = '0'                  delay in ms (default 250 to 600)
//   localStorage['pb.mock.fail'] = 'getListings,makeOffer'  or '*': those throw ApiError(500)
const LATENCY_KEY = 'pb.mock.latency'
const FAIL_KEY = 'pb.mock.fail'
const DEV = import.meta.env.DEV || import.meta.env.MODE === 'test'
const TABLES = ['courses', 'users', 'listings', 'offers']

let db = null
let ready = null
let coursesCache = null

const isDb = (x) =>
  !!x &&
  typeof x === 'object' &&
  x.version === DB_VERSION &&
  typeof x.seededAt === 'string' &&
  TABLES.every((t) => Array.isArray(x[t]))

// Seed data is a dynamic import, so it (and the demo passwords) ships as its own chunk and
// is only fetched when there is no stored database.
async function seedDb() {
  const { buildSeed } = await import('./mock')
  const at = Date.now()
  return {
    version: DB_VERSION,
    seededAt: new Date(at).toISOString(),
    ...buildSeed({ now: at }),
  }
}

/**
 * Seed dates are relative to when the data was seeded, so stored data ages ("posted today"
 * turns into last week). Once it is a day old, move seed rows forward by the time elapsed.
 * Rows people created keep their real dates. Returns true when anything changed.
 */
function refreshSeedDates() {
  const elapsed = Date.now() - Date.parse(db.seededAt)
  if (!(elapsed > DAY_MS)) return false
  const shift = (iso) =>
    new Date(Math.min(Date.parse(iso) + elapsed, Date.now())).toISOString()
  for (const row of [...db.listings, ...db.offers]) {
    if (!SEED_ID.test(row.id)) continue
    if (row.createdAt) row.createdAt = shift(row.createdAt)
    if (row.updatedAt) row.updatedAt = shift(row.updatedAt)
  }
  db.seededAt = new Date().toISOString()
  return true
}

function save() {
  coursesCache = null // listing counts may have changed
  writeJSON(DB_KEY, db)
}

/** Loads the stored database once (or seeds a fresh one). Every API call awaits it. */
function ensureDb() {
  ready ??= (async () => {
    const stored = readJSON(DB_KEY)
    if (isDb(stored)) {
      db = stored
      if (refreshSeedDates()) save()
    } else {
      db = await seedDb()
      save()
    }
    currentUserId() // drops a session whose user is gone
  })().catch((err) => {
    ready = null
    throw err
  })
  return ready
}

function latency() {
  const raw = readString(LATENCY_KEY)?.replace(/"/g, '').trim()
  const ms = raw ? Number(raw) : Number.NaN
  return Number.isFinite(ms) && ms >= 0 ? ms : 250 + Math.random() * 350
}

function failSwitch(name) {
  if (!DEV) return
  const names = (readString(FAIL_KEY) ?? '').split(',').map((n) => n.trim())
  if (names.includes('*') || names.includes(name))
    throw new ApiError(500, 'Simulated failure')
}

/** Start of every API function: data loaded, simulated network delay, failure switch. */
async function begin(name) {
  await ensureDb()
  const ms = latency()
  if (ms > 0) await new Promise((r) => setTimeout(r, ms))
  failSwitch(name)
}

/** Throws away every change and restores the seed (dev tools, demos, tests). */
export async function resetDemoData() {
  await ensureDb()
  db = await seedDb()
  save()
  currentUserId()
}
const clone = (x) => structuredClone(x)
const now = () => new Date().toISOString()

let idSeq = 0
function newId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return `${prefix}_${uuid}`
  idSeq += 1
  return `${prefix}_${Date.now().toString(36)}${idSeq.toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

/** What anyone may see about a user: never the email or password. */
const publicUser = (u) =>
  u && {
    id: u.id,
    name: u.name,
    memberSince: u.memberSince,
    yearOfStudy: u.yearOfStudy,
    usualPickupSpot: u.usualPickupSpot,
  }
/** The signed-in user's own record: everything but the password. */
const selfUser = ({ password: _p, ...u }) => u
/** Name tag for offers: { id, name }. */
const nameTag = (u) => (u ? { id: u.id, name: u.name } : null)

const findUser = (id) => db.users.find((u) => u.id === id)
const findListing = (id) => db.listings.find((l) => l.id === id)

function currentUserId() {
  const id = readJSON(SESSION_KEY)?.userId ?? null
  if (id && !findUser(id)) {
    // The session points at someone who no longer exists (reset data, old storage).
    removeKey(SESSION_KEY)
    return null
  }
  return id
}
function requireUser() {
  const id = currentUserId()
  if (!id) throw new ApiError(401, 'Sign in to continue.')
  return id
}

const tornOut = () => new ApiError(404, 'This page was torn out.')
const notYours = () => new ApiError(403, 'That listing is not yours.')

/**
 * Listing plus its seller block (doc 5.3): name, member since, usual pickup spot and
 * active listing count. The email (for "Contact seller") only goes to signed-in viewers.
 */
function withSeller(l) {
  const u = findUser(l.sellerId)
  const seller = u && {
    ...publicUser(u),
    activeListingCount: db.listings.filter(
      (x) => x.sellerId === u.id && x.status === 'active',
    ).length,
  }
  if (seller && currentUserId()) seller.email = u.email
  return { ...clone(l), seller }
}
const visible = (l) => l.status !== 'draft'
/** Drafts exist only for their owner; everyone else gets a 404. */
function readableListing(id) {
  const l = findListing(id)
  if (!l || (l.status === 'draft' && l.sellerId !== currentUserId())) throw tornOut()
  return l
}

// ---------- listings ----------
export async function getListings(filters = {}) {
  await begin('getListings')
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
  await begin('getFeaturedListings')
  return clone(db.listings.filter((l) => l.featured && l.status === 'active').slice(0, 5))
}

export async function getNewListings(limit = 10) {
  await begin('getNewListings')
  return clone(
    db.listings
      .filter((l) => l.status === 'active')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit),
  )
}

export async function getListing(id) {
  await begin('getListing')
  return withSeller(readableListing(id))
}

// Fields a client may set. Everything else (id, sellerId, featured, dates) is the server's.
const EDITABLE = [
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
function editable(data) {
  const out = {}
  for (const k of EDITABLE) if (data && Object.hasOwn(data, k)) out[k] = data[k]
  if (typeof out.title === 'string') out.title = out.title.trim()
  if (Array.isArray(out.courseCodes))
    out.courseCodes = [...new Set(out.courseCodes.map((c) => normalizeCode(c) ?? c))]
  if (typeof out.isbn === 'string') out.isbn = out.isbn.replace(/[\s-]/g, '') || null
  return out
}

/** Throws a 422 with field errors when the listing breaks the rules. */
function checkListing(listing) {
  const fields = validateListingInput(listing, { draft: listing.status === 'draft' })
  const unknown = (listing.courseCodes ?? []).filter(
    (c) => !db.courses.some((course) => course.code === c),
  )
  if (!fields.courseCodes && unknown.length)
    fields.courseCodes = `No ${unknown[0]} in the index. Pick a course from the list.`
  if (Object.keys(fields).length)
    throw new ApiError(422, Object.values(fields).join(' '), fields)
}

export async function createListing(data) {
  await begin('createListing')
  const sellerId = requireUser()
  const input = editable(data)
  if (input.status !== undefined && !['draft', 'active'].includes(input.status))
    throw new ApiError(422, 'New listings start as a draft or active.', {
      status: 'New listings start as a draft or active.',
    })
  const time = now()
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
    courseCodes: [],
    ...input,
    id: newId('lst'),
    sellerId,
    status: input.status ?? 'active',
    featured: false,
    createdAt: time,
    updatedAt: time,
  }
  checkListing(listing)
  db.listings.unshift(listing)
  save()
  return clone(listing)
}

export async function updateListing(id, data) {
  await begin('updateListing')
  const userId = requireUser()
  const i = db.listings.findIndex((l) => l.id === id)
  if (i < 0) throw tornOut()
  const current = db.listings[i]
  if (current.sellerId !== userId) throw notYours()
  const next = { ...current, ...editable(data), updatedAt: now() }
  checkListing(next)
  db.listings[i] = next
  save()
  return clone(next)
}

export async function deleteListing(id) {
  await begin('deleteListing')
  const userId = requireUser()
  const l = findListing(id)
  if (!l) throw tornOut()
  if (l.sellerId !== userId) throw notYours()
  db.listings = db.listings.filter((x) => x.id !== id)
  db.offers = db.offers.filter((o) => o.listingId !== id)
  save()
}

export async function getMyListings() {
  await begin('getMyListings')
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
// The course index barely changes, and the header lookup asks for it every time it opens, so
// it is kept in memory (coursesCache, at the top) until the next write (save() clears it).
// Failures are never cached.

export async function getCourses() {
  if (coursesCache) {
    failSwitch('getCourses')
    return clone(coursesCache)
  }
  await begin('getCourses')
  coursesCache = db.courses.map((c) => ({
    ...clone(c),
    listingCount: db.listings.filter(
      (l) => l.status === 'active' && l.courseCodes.includes(c.code),
    ).length,
  }))
  return clone(coursesCache)
}

export async function getCourse(code) {
  await begin('getCourse')
  const courses = db.courses
  const norm = normalizeCode(code)
  const course = courses.find((c) => c.code === norm)
  if (!course) {
    const near = norm
      ? courses.filter((c) => c.department === norm.split(' ')[0]).map((c) => c.code)
      : []
    const err = new ApiError(404, `No ${norm ?? code} in the index.`)
    err.closest = near.length ? near : courses.slice(0, 3).map((c) => c.code)
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
const closedReason = {
  reserved: 'This listing is reserved for another buyer.',
  sold: 'This listing is sold.',
  draft: 'This listing is not posted yet.',
}

export async function makeOffer(listingId, { amountCents, message = '' } = {}) {
  await begin('makeOffer')
  const buyerId = requireUser()
  const l = readableListing(listingId)
  if (l.sellerId === buyerId)
    throw new ApiError(422, 'You cannot make an offer on your own listing.')
  if (l.status !== 'active') throw new ApiError(422, closedReason[l.status])
  if (!l.openToOffers)
    throw new ApiError(422, "This seller isn't taking offers. Buy at the asking price.")
  if (
    db.offers.some(
      (o) => o.listingId === listingId && o.buyerId === buyerId && o.status === 'pending',
    )
  )
    throw new ApiError(
      422,
      'You already have an offer waiting on this listing. Withdraw it to make a new one.',
    )
  if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > l.priceCents) {
    const msg = 'Enter an amount above $0 and at most the asking price.'
    throw new ApiError(422, msg, { amountCents: msg })
  }
  const note = String(message ?? '').trim()
  if (note.length > MAX_OFFER_MESSAGE) {
    const msg = `Keep the message under ${MAX_OFFER_MESSAGE} characters.`
    throw new ApiError(422, msg, { message: msg })
  }
  const offer = {
    id: newId('off'),
    listingId,
    buyerId,
    amountCents,
    message: note,
    status: 'pending',
    counterCents: null,
    createdAt: now(),
  }
  db.offers.unshift(offer)
  save()
  return clone(offer)
}

/**
 * Offers you received (on your listings) or sent. Each carries a listing summary
 * { id, title, priceCents, courseCodes, status, sellerName } and buyer/seller { id, name }.
 */
export async function getOffers({ direction = 'received' } = {}) {
  await begin('getOffers')
  const userId = requireUser()
  const mine = new Set(db.listings.filter((l) => l.sellerId === userId).map((l) => l.id))
  const rows = db.offers.filter((o) =>
    direction === 'received' ? mine.has(o.listingId) : o.buyerId === userId,
  )
  return rows.map((o) => {
    const l = findListing(o.listingId)
    const seller = l && findUser(l.sellerId)
    return {
      ...clone(o),
      listing: l
        ? {
            id: l.id,
            title: l.title,
            priceCents: l.priceCents,
            courseCodes: [...l.courseCodes],
            status: l.status,
            sellerName: seller?.name ?? null,
          }
        : null,
      buyer: nameTag(findUser(o.buyerId)),
      seller: nameTag(seller),
    }
  })
}

/**
 * Accepting marks the offer accepted and the listing reserved (doc 5.6). Other pending
 * offers stay pending: the dashboard then offers to decline them.
 */
function accept(offer, listing) {
  if (listing.status !== 'active')
    throw new ApiError(422, closedReason[listing.status] ?? 'This listing is closed.')
  offer.status = 'accepted'
  listing.status = 'reserved'
  listing.updatedAt = now()
}

/**
 * Seller, on a pending offer: accept (the listing must be active; it becomes reserved),
 * decline (also allowed once the listing is reserved, for the other offers), counter
 * (counterCents between the offer and the asking price). Buyer: withdraw a pending offer;
 * on a countered one accept (at the counter), decline or withdraw. Anything else, or an
 * offer that is no longer open, is a 422.
 */
export async function respondToOffer(id, action, counterCents) {
  await begin('respondToOffer')
  const userId = requireUser()
  const o = db.offers.find((x) => x.id === id)
  if (!o) throw new ApiError(404, 'Offer not found.')
  const l = findListing(o.listingId)
  const isSeller = l?.sellerId === userId
  const isBuyer = o.buyerId === userId
  if (!isSeller && !isBuyer) throw new ApiError(403, 'That offer is not yours.')
  if (!['accept', 'decline', 'counter', 'withdraw'].includes(action))
    throw new ApiError(422, 'Unknown action.')

  const closed = () => new ApiError(422, 'This offer is no longer open.')
  if (isSeller && !isBuyer) {
    if (action === 'withdraw') throw new ApiError(403, 'That offer is not yours.')
    if (o.status !== 'pending') throw closed()
    if (action === 'accept') accept(o, l)
    else if (action === 'decline') o.status = 'declined'
    else {
      if (
        !Number.isInteger(counterCents) ||
        counterCents <= o.amountCents ||
        counterCents >= l.priceCents
      ) {
        const msg = 'Counter with an amount between their offer and your asking price.'
        throw new ApiError(422, msg, { counterCents: msg })
      }
      o.status = 'countered'
      o.counterCents = counterCents
    }
  } else {
    if (action === 'counter') throw new ApiError(403, 'Only the seller can counter.')
    if (o.status === 'pending') {
      if (action !== 'withdraw') throw new ApiError(403, 'That listing is not yours.')
      o.status = 'withdrawn'
    } else if (o.status === 'countered') {
      if (action === 'accept') accept(o, l)
      else o.status = action === 'withdraw' ? 'withdrawn' : 'declined'
    } else throw closed()
  }
  save()
  return clone(o)
}

// ---------- auth ----------
const cleanEmail = (email) =>
  String(email ?? '')
    .trim()
    .toLowerCase()

export async function login(email, password) {
  await begin('login')
  const u = db.users.find((x) => x.email === cleanEmail(email) && x.password === password)
  if (!u) throw new ApiError(401, "That email and password don't match.")
  writeJSON(SESSION_KEY, { userId: u.id })
  return selfUser(u)
}

export async function register({ name, email, password, yearOfStudy } = {}) {
  await begin('register')
  const cleanName = String(name ?? '').trim()
  const address = cleanEmail(email)
  const fields = {}
  if (!cleanName) fields.name = 'Add your name.'
  if (!/^[^\s@]+@[^\s@]+$/.test(address))
    fields.email = 'Enter an email like you@school.edu.'
  if (!password) fields.password = 'Choose a password.'
  if (Object.keys(fields).length)
    throw new ApiError(422, Object.values(fields).join(' '), fields)
  if (db.users.some((u) => u.email === address))
    throw new ApiError(422, 'That email already has a card. Sign in instead.', {
      email: 'That email already has a card. Sign in instead.',
    })
  const u = {
    id: newId('usr'),
    name: cleanName,
    email: address,
    password,
    memberSince: now(),
    yearOfStudy: yearOfStudy || undefined,
  }
  db.users.push(u)
  save()
  writeJSON(SESSION_KEY, { userId: u.id })
  return selfUser(u)
}

export async function logout() {
  await begin('logout')
  removeKey(SESSION_KEY)
}

export async function getCurrentUser() {
  await begin('getCurrentUser')
  const id = currentUserId()
  const u = id && findUser(id)
  return u ? selfUser(u) : null
}
