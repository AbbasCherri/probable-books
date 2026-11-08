// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const DB_KEY = 'pb.db.v2'
const SESSION_KEY = 'pb.session'
let api

async function freshApi() {
  vi.resetModules()
  api = await import('@/services/api')
  return api
}

const as = (email) => api.login(email, 'password123')
const asDemo = () => as('demo@probable.books')

async function expectError(promise, status, fieldOrPattern) {
  const err = await promise.then(
    () => null,
    (e) => e,
  )
  expect(err, 'expected the call to throw').toBeInstanceOf(api.ApiError)
  expect(err.status).toBe(status)
  if (typeof fieldOrPattern === 'string')
    expect(err.fields).toHaveProperty(fieldOrPattern)
  if (fieldOrPattern instanceof RegExp) expect(err.message).toMatch(fieldOrPattern)
  return err
}

const newListing = (over = {}) => ({
  title: 'Splash goggles, anti-fog',
  category: 'lab_gear',
  courseCodes: ['CHEM 201'],
  condition: 'like_new',
  conditionNotes: [],
  description: 'Worn twice.',
  priceCents: 600,
  retailCents: null,
  openToOffers: true,
  photos: [],
  pickupSpot: 'Science building lobby',
  ...over,
})

beforeEach(async () => {
  localStorage.clear()
  localStorage.setItem('pb.mock.latency', '0')
  await freshApi()
})

describe('reads', () => {
  it('lists six pages of visible listings and hides drafts', async () => {
    const res = await api.getListings({})
    expect(res.total).toBeGreaterThanOrEqual(121)
    expect(Math.ceil(res.total / res.pageSize)).toBe(6)
    expect(res.items).toHaveLength(24)
    const all = await api.getListings({ pageSize: 1000 })
    expect(all.items.some((l) => l.status === 'draft')).toBe(false)
  })

  it('returns courses from the seed with listing counts', async () => {
    const courses = await api.getCourses()
    expect(courses.length).toBeGreaterThanOrEqual(15)
    expect(courses.find((c) => c.code === 'CHEM 201').listingCount).toBeGreaterThan(24)
    const chem = await api.getCourse('chem-201')
    expect(chem.stats.listingCount).toBeGreaterThan(24)
  })

  it('hides drafts from everyone but the owner', async () => {
    const drafts = (await asDemo(), await api.getMyListings()).filter(
      (l) => l.status === 'draft',
    )
    expect(drafts).toHaveLength(2)
    const own = await api.getListing(drafts[0].id)
    expect(own.id).toBe(drafts[0].id)
    await api.logout()
    await expectError(api.getListing(drafts[0].id), 404)
    await as('lina@probable.books')
    await expectError(api.getListing(drafts[0].id), 404)
  })

  it('never leaks passwords or emails of other users', async () => {
    const l = await api.getListing('lst_001')
    expect(l.seller.name).toBeTruthy()
    expect(l.seller).not.toHaveProperty('password')
    expect(l.seller).not.toHaveProperty('email')
  })
})

describe('auth', () => {
  it('registers with a trimmed, lowercased email and logs in with any case', async () => {
    const u = await api.register({
      name: '  New Person ',
      email: '  New.Person@Example.COM ',
      password: 'secret123',
    })
    expect(u.email).toBe('new.person@example.com')
    expect(u.name).toBe('New Person')
    expect(u).not.toHaveProperty('password')
    await api.logout()
    await expect(api.login('NEW.person@example.com', 'secret123')).resolves.toBeTruthy()
    await expectError(
      api.register({ name: 'X', email: 'new.person@example.com ', password: 'abcdefgh' }),
      422,
    )
  })

  it('clears a session whose user does not exist', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: 'usr_ghost' }))
    await freshApi()
    expect(await api.getCurrentUser()).toBeNull()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('uses uuid-style ids for new records', async () => {
    const u = await api.register({ name: 'A B', email: 'ab@x.io', password: 'abcdefgh' })
    expect(u.id).toMatch(/^usr_[0-9a-f-]{36}$/)
  })
})

describe('listing writes', () => {
  it('requires sign-in', async () => {
    await expectError(api.createListing(newListing()), 401)
  })

  it('creates with whitelisted fields only', async () => {
    await asDemo()
    const l = await api.createListing(
      newListing({
        id: 'lst_hack',
        sellerId: 'usr_lina',
        featured: true,
        createdAt: '2000-01-01T00:00:00Z',
        updatedAt: '2000-01-01T00:00:00Z',
        bogus: 1,
      }),
    )
    expect(l.id).not.toBe('lst_hack')
    expect(l.id).toMatch(/^lst_[0-9a-f-]{36}$/)
    expect(l.sellerId).toBe('usr_demo')
    expect(l.featured).toBe(false)
    expect(l.createdAt.startsWith('2000')).toBe(false)
    expect(l).not.toHaveProperty('bogus')
    expect(l.status).toBe('active')
  })

  it('rejects invalid input with 422 and field errors', async () => {
    await asDemo()
    const err = await expectError(
      api.createListing(newListing({ title: 'abc', priceCents: 0 })),
      422,
      'title',
    )
    expect(err.fields).toHaveProperty('priceCents')
    await expectError(api.createListing(newListing({ status: 'sold' })), 422, 'status')
    await expectError(
      api.createListing(newListing({ courseCodes: ['ZZZ 999'] })),
      422,
      'courseCodes',
    )
  })

  it('accepts zero photos and saves drafts with missing fields', async () => {
    await asDemo()
    await expect(api.createListing(newListing({ photos: [] }))).resolves.toBeTruthy()
    const draft = await api.createListing({ title: 'Half a listing', status: 'draft' })
    expect(draft.status).toBe('draft')
    await expectError(api.updateListing(draft.id, { status: 'active' }), 422)
  })

  it('updates own listings, ignoring protected fields', async () => {
    await asDemo()
    const next = await api.updateListing('lst_002', {
      priceCents: 850,
      sellerId: 'usr_lina',
      featured: true,
      id: 'other',
    })
    expect(next.priceCents).toBe(850)
    expect(next.sellerId).toBe('usr_demo')
    expect(next.featured).toBe(false)
    expect(next.id).toBe('lst_002')
    await expectError(api.updateListing('lst_002', { status: 'gone' }), 422, 'status')
  })

  it("answers 403 for someone else's listing", async () => {
    await asDemo()
    await expectError(api.updateListing('lst_001', { priceCents: 100 }), 403)
    await expectError(api.deleteListing('lst_001'), 403)
  })
})

describe('offers', () => {
  it('only allows offers on active, open listings that are not yours', async () => {
    await asDemo()
    await expectError(api.makeOffer('lst_002', { amountCents: 500 }), 422, /own listing/)
    await expectError(api.makeOffer('lst_007', { amountCents: 400 }), 422, /offers/) // closed
    await expectError(api.makeOffer('lst_014', { amountCents: 400 }), 422) // reserved
    await expectError(api.makeOffer('nope', { amountCents: 400 }), 404)
  })

  it('checks the amount and the message', async () => {
    await asDemo()
    await expectError(api.makeOffer('lst_006', { amountCents: 0 }), 422, 'amountCents')
    await expectError(api.makeOffer('lst_006', { amountCents: 1201 }), 422, 'amountCents')
    await expectError(api.makeOffer('lst_006', { amountCents: 10.5 }), 422, 'amountCents')
    await expectError(
      api.makeOffer('lst_006', { amountCents: 1000, message: 'x'.repeat(281) }),
      422,
      'message',
    )
    const o = await api.makeOffer('lst_006', { amountCents: 1200, message: '  hi  ' })
    expect(o.status).toBe('pending')
    expect(o.message).toBe('hi')
  })

  it('allows one pending offer per buyer per listing', async () => {
    await asDemo()
    const o = await api.makeOffer('lst_006', { amountCents: 1000 })
    await expectError(api.makeOffer('lst_006', { amountCents: 1100 }), 422, /already/)
    await api.respondToOffer(o.id, 'withdraw')
    await expect(api.makeOffer('lst_006', { amountCents: 1100 })).resolves.toBeTruthy()
  })

  it('accepting reserves the listing and declines the other pending offers', async () => {
    await asDemo()
    const before = (await api.getOffers({ direction: 'received' })).filter(
      (o) => o.listingId === 'lst_002' && o.status === 'pending',
    )
    expect(before.length).toBeGreaterThanOrEqual(3)
    const [first, ...rest] = before
    const accepted = await api.respondToOffer(first.id, 'accept')
    expect(accepted.status).toBe('accepted')
    const listing = await api.getListing('lst_002')
    expect(listing.status).toBe('reserved')
    const after = await api.getOffers({ direction: 'received' })
    for (const o of rest) expect(after.find((x) => x.id === o.id).status).toBe('declined')
    // The dashboard still marks it reserved and declines "the others" afterwards.
    await expect(
      api.updateListing('lst_002', { status: 'reserved' }),
    ).resolves.toBeTruthy()
    await expect(api.respondToOffer(rest[0].id, 'decline')).resolves.toMatchObject({
      status: 'declined',
    })
  })

  it('only acts on pending offers, by the right party', async () => {
    await asDemo()
    const received = await api.getOffers({ direction: 'received' })
    const pending = received.find((o) => o.status === 'pending')
    await expectError(api.respondToOffer(pending.id, 'withdraw'), 403)
    await expectError(api.respondToOffer(pending.id, 'shrug'), 422)
    await api.respondToOffer(pending.id, 'decline')
    await expectError(api.respondToOffer(pending.id, 'accept'), 422)
    const sent = await api.getOffers({ direction: 'sent' })
    const mine = sent.find((o) => o.status === 'pending')
    await expectError(api.respondToOffer(mine.id, 'accept'), 403)
    await expectError(api.respondToOffer('off_nope', 'accept'), 404)
  })

  it('supports counters between the offer and the asking price', async () => {
    await asDemo()
    const received = await api.getOffers({ direction: 'received' })
    const o = received.find((x) => x.status === 'pending')
    await expectError(api.respondToOffer(o.id, 'counter', o.amountCents), 422)
    await expectError(api.respondToOffer(o.id, 'counter', o.listing.priceCents), 422)
    const mid = o.amountCents + 1
    const countered = await api.respondToOffer(o.id, 'counter', mid)
    expect(countered).toMatchObject({ status: 'countered', counterCents: mid })
    // Waiting on the buyer now; the seller can't act on it again.
    await expectError(api.respondToOffer(o.id, 'accept'), 422)
  })

  it('lets the buyer accept a counter', async () => {
    await asDemo()
    const sent = await api.getOffers({ direction: 'sent' })
    const countered = sent.find((o) => o.status === 'countered')
    expect(countered).toBeTruthy()
    const done = await api.respondToOffer(countered.id, 'accept')
    expect(done.status).toBe('accepted')
    expect((await api.getListing(countered.listingId)).status).toBe('reserved')
  })

  it('returns offers with listing, buyer and seller summaries', async () => {
    await asDemo()
    const sent = await api.getOffers({ direction: 'sent' })
    expect(sent.length).toBeGreaterThanOrEqual(5)
    for (const o of sent) {
      expect(o.buyerId).toBe('usr_demo')
      expect(Object.keys(o.listing).sort()).toEqual(
        expect.arrayContaining(['id', 'title', 'priceCents', 'courseCodes', 'status']),
      )
      expect(o.listing.courseCodes.length).toBeGreaterThan(0)
      expect(Object.keys(o.seller).sort()).toEqual(['id', 'name'])
      expect(Object.keys(o.buyer).sort()).toEqual(['id', 'name'])
      expect(o.listing.sellerName).toBe(o.seller.name)
    }
    const received = await api.getOffers({ direction: 'received' })
    for (const o of received) expect(o.seller.id).toBe('usr_demo')
  })
})

describe('mock controls', () => {
  it('fails named functions on demand', async () => {
    localStorage.setItem('pb.mock.fail', 'getListings, getCourses')
    await expectError(api.getListings({}), 500, /Simulated failure/)
    await expectError(api.getCourses(), 500)
    await expect(api.getFeaturedListings()).resolves.toBeTruthy()
    localStorage.setItem('pb.mock.fail', '*')
    await expectError(api.getFeaturedListings(), 500)
    localStorage.removeItem('pb.mock.fail')
    await expect(api.getListings({})).resolves.toBeTruthy()
  })

  it('honours a latency of 0', async () => {
    const t = performance.now()
    for (let i = 0; i < 5; i += 1) await api.getFeaturedListings()
    expect(performance.now() - t).toBeLessThan(200)
  })

  it('persists writes and reloads them', async () => {
    await asDemo()
    const l = await api.createListing(newListing({ title: 'Persisted goggles' }))
    expect(
      JSON.parse(localStorage.getItem(DB_KEY)).listings.some((x) => x.id === l.id),
    ).toBe(true)
    await freshApi()
    expect((await api.getListing(l.id)).title).toBe('Persisted goggles')
  })

  it('reseeds when the stored db is corrupt or another version', async () => {
    localStorage.setItem(DB_KEY, '{not json')
    await freshApi()
    expect((await api.getListings({})).total).toBeGreaterThan(120)
    localStorage.setItem(DB_KEY, JSON.stringify({ version: 1, listings: [] }))
    await freshApi()
    expect((await api.getListings({})).total).toBeGreaterThan(120)
  })

  it('loads the seed with a dynamic import only', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/services/api.js'), 'utf8')
    expect(src).not.toMatch(/^import .*['"]\.\/mock/m)
    expect(src).toMatch(/await import\('\.\/mock'\)/)
  })

  it('resetDemoData restores the seed', async () => {
    await asDemo()
    const l = await api.createListing(newListing())
    await api.resetDemoData()
    await expectError(api.getListing(l.id), 404)
    expect((await api.getCurrentUser())?.id).toBe('usr_demo')
  })
})
