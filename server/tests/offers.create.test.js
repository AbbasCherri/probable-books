// POST /api/listings/:id/offers and GET /api/offers (requirements C2).
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import offersCreate, { MESSAGES as M } from '../src/routes/offers.create.js'
import {
  deleteCourses,
  deleteUsers,
  endPool,
  insertCourses,
  insertListing,
  insertOffer,
  insertUsers,
  makeApp,
  newTag,
  q,
} from './helpers/wazan.js'

const app = makeApp(offersCreate)
let users

beforeAll(async () => {
  users = await insertUsers(newTag(), ['seller', 'buyer', 'buyer2', 'other'])
})
afterAll(async () => {
  await deleteUsers(users)
  await endPool()
})

const offer = (user, listingId, body) => {
  const r = request(app).post(`/api/listings/${listingId}/offers`)
  return (user ? r.set('x-test-user', user) : r).send(body)
}
const list = (user, direction) => {
  const r = request(app).get('/api/offers')
  if (direction !== undefined) r.query({ direction })
  return user ? r.set('x-test-user', user) : r
}
const OFFER_KEYS = [
  'amountCents',
  'buyerId',
  'counterCents',
  'createdAt',
  'id',
  'listingId',
  'message',
  'status',
]

describe('POST /api/listings/:id/offers', () => {
  it('creates a pending offer with the exact Offer shape', async () => {
    const listing = await insertListing(users.seller)
    const res = await offer(users.buyer, listing, {
      amountCents: 4000,
      message: '  After 3 works.  ',
    })
    expect(res.status).toBe(201)
    expect(Object.keys(res.body).sort()).toEqual(OFFER_KEYS)
    expect(res.body).toMatchObject({
      listingId: listing,
      buyerId: users.buyer,
      amountCents: 4000,
      message: 'After 3 works.',
      status: 'pending',
      counterCents: null,
    })
    expect(res.body.id).toMatch(/^off_/)
    expect(new Date(res.body.createdAt).toISOString()).toBe(res.body.createdAt)
  })

  it('treats a missing message as empty text and allows exactly the asking price', async () => {
    const listing = await insertListing(users.seller, { price_cents: 5000 })
    const res = await offer(users.buyer, listing, { amountCents: 5000 })
    expect(res.status).toBe(201)
    expect(res.body.message).toBe('')
  })

  it('does not change the listing', async () => {
    const listing = await insertListing(users.seller)
    const [before] = await q('SELECT status, updated_at FROM listings WHERE id = $1', [
      listing,
    ])
    await offer(users.buyer, listing, { amountCents: 1000 })
    const [after] = await q('SELECT status, updated_at FROM listings WHERE id = $1', [
      listing,
    ])
    expect(after).toEqual(before)
  })

  it('401 when signed out', async () => {
    const listing = await insertListing(users.seller)
    const res = await offer(null, listing, { amountCents: 1000 })
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: M.signIn })
  })

  it('404 for an unknown listing and for someone else’s draft', async () => {
    const draft = await insertListing(users.seller, { status: 'draft' })
    for (const id of ['lst_does_not_exist', draft]) {
      const res = await offer(users.buyer, id, { amountCents: 1000 })
      expect(res.status).toBe(404)
      expect(res.body).toEqual({ message: M.notFound })
    }
  })

  it('422 on your own listing (also your own draft, which is not a 404)', async () => {
    for (const status of ['active', 'draft']) {
      const listing = await insertListing(users.seller, { status })
      const res = await offer(users.seller, listing, { amountCents: 1000 })
      expect(res.status).toBe(422)
      expect(res.body).toEqual({ message: M.ownListing })
    }
  })

  it('422 when the listing is reserved or sold', async () => {
    for (const [status, message] of [
      ['reserved', M.reserved],
      ['sold', M.sold],
    ]) {
      const listing = await insertListing(users.seller, { status })
      const res = await offer(users.buyer, listing, { amountCents: 1000 })
      expect(res.status).toBe(422)
      expect(res.body).toEqual({ message })
    }
  })

  it('422 when the seller does not take offers', async () => {
    const listing = await insertListing(users.seller, { open_to_offers: false })
    const res = await offer(users.buyer, listing, { amountCents: 1000 })
    expect(res.status).toBe(422)
    expect(res.body).toEqual({ message: M.noOffers })
  })

  it('422 when the buyer already has a pending offer; allowed again once withdrawn', async () => {
    const listing = await insertListing(users.seller)
    const first = await insertOffer(listing, users.buyer)
    const res = await offer(users.buyer, listing, { amountCents: 1000 })
    expect(res.status).toBe(422)
    expect(res.body).toEqual({ message: M.alreadyPending })

    // Another buyer is unaffected.
    expect((await offer(users.buyer2, listing, { amountCents: 1000 })).status).toBe(201)

    await q(`UPDATE offers SET status = 'withdrawn' WHERE id = $1`, [first])
    expect((await offer(users.buyer, listing, { amountCents: 1000 })).status).toBe(201)
  })

  it('422 fields.amountCents for a bad amount', async () => {
    const listing = await insertListing(users.seller, { price_cents: 5000 })
    for (const amountCents of [0, -5, 5001, 12.5, '4000', null, undefined]) {
      const res = await offer(users.buyer, listing, { amountCents })
      expect(res.status, `amountCents ${amountCents}`).toBe(422)
      expect(res.body).toEqual({ message: M.amount, fields: { amountCents: M.amount } })
    }
  })

  it('422 fields.amountCents when no body is sent at all', async () => {
    const listing = await insertListing(users.seller)
    const res = await request(app)
      .post(`/api/listings/${listing}/offers`)
      .set('x-test-user', users.buyer)
    expect(res.status).toBe(422)
    expect(res.body.fields).toEqual({ amountCents: M.amount })
  })

  it('422 fields.message over 280 characters after trimming', async () => {
    const listing = await insertListing(users.seller)
    const ok = await offer(users.buyer, listing, {
      amountCents: 1000,
      message: ` ${'a'.repeat(280)} `,
    })
    expect(ok.status).toBe(201)

    const listing2 = await insertListing(users.seller)
    const res = await offer(users.buyer, listing2, {
      amountCents: 1000,
      message: 'a'.repeat(281),
    })
    expect(res.status).toBe(422)
    expect(res.body).toEqual({
      message: M.messageLength,
      fields: { message: M.messageLength },
    })
  })

  it('reports the first failure in table order', async () => {
    // Sold beats a bad amount; a bad amount beats a long message.
    const sold = await insertListing(users.seller, { status: 'sold' })
    const res1 = await offer(users.buyer, sold, { amountCents: 0 })
    expect(res1.body).toEqual({ message: M.sold })

    const listing = await insertListing(users.seller)
    const res2 = await offer(users.buyer, listing, {
      amountCents: 0,
      message: 'a'.repeat(300),
    })
    expect(res2.body.fields).toEqual({ amountCents: M.amount })
  })

  it('two identical offers at the same moment: one 201, one 422', async () => {
    const listing = await insertListing(users.seller)
    const body = { amountCents: 2500 }
    const results = await Promise.all([
      offer(users.buyer, listing, body),
      offer(users.buyer, listing, body),
    ])
    expect(results.map((r) => r.status).sort()).toEqual([201, 422])
    expect(results.find((r) => r.status === 422).body).toEqual({
      message: M.alreadyPending,
    })
    const rows = await q('SELECT id FROM offers WHERE listing_id = $1', [listing])
    expect(rows).toHaveLength(1)
  })
})

describe('GET /api/offers', () => {
  let ctx
  beforeAll(async () => {
    // seller has two listings; buyer and buyer2 offer on them; other offers on buyer's listing.
    const a = await insertListing(users.seller, { title: 'Seller listing A' })
    const b = await insertListing(users.seller, { title: 'Seller listing B' })
    const theirs = await insertListing(users.buyer, { title: 'Buyer own listing' })
    const o1 = await insertOffer(a, users.buyer, { status: 'declined' })
    const o2 = await insertOffer(b, users.buyer2, {
      status: 'countered',
      counter_cents: 4500,
    })
    const o3 = await insertOffer(theirs, users.other)
    // Fixed times so "newest first" is checkable.
    await q(`UPDATE offers SET created_at = $2 WHERE id = $1`, [
      o1,
      '2026-11-01T10:00:00Z',
    ])
    await q(`UPDATE offers SET created_at = $2 WHERE id = $1`, [
      o2,
      '2026-11-02T10:00:00Z',
    ])
    ctx = { a, b, theirs, o1, o2, o3 }
  })

  it('401 when signed out', async () => {
    const res = await list(null)
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: M.signIn })
  })

  it('422 for any other direction', async () => {
    for (const direction of ['both', '', 'RECEIVED']) {
      const res = await list(users.seller, direction)
      expect(res.status, `direction "${direction}"`).toBe(422)
      expect(res.body).toEqual({
        message: M.direction,
        fields: { direction: M.direction },
      })
    }
  })

  it('received is the default: offers on my listings, every status, newest first', async () => {
    const res = await list(users.seller)
    expect(res.status).toBe(200)
    const mine = res.body.filter((o) => [ctx.o1, ctx.o2].includes(o.id))
    expect(mine.map((o) => o.id)).toEqual([ctx.o2, ctx.o1])
    expect(res.body.every((o) => o.seller.id === users.seller)).toBe(true)

    const [countered] = mine
    expect(countered).toMatchObject({
      status: 'countered',
      counterCents: 4500,
      buyer: { id: users.buyer2, name: 'Test buyer2' },
      seller: { id: users.seller, name: 'Test seller' },
      listing: {
        id: ctx.b,
        title: 'Seller listing B',
        priceCents: 5000,
        courseCodes: [],
        status: 'active',
        sellerName: 'Test seller',
      },
    })
    expect(Object.keys(countered).sort()).toEqual(
      [...OFFER_KEYS, 'buyer', 'listing', 'seller'].sort(),
    )
  })

  it('sent: only offers I made', async () => {
    const res = await list(users.buyer, 'sent')
    expect(res.status).toBe(200)
    expect(res.body.map((o) => o.id)).toContain(ctx.o1)
    expect(res.body.every((o) => o.buyer.id === users.buyer)).toBe(true)
    // The offer on buyer's own listing is "received" for buyer, not "sent".
    expect(res.body.map((o) => o.id)).not.toContain(ctx.o3)
  })

  it('never shows other people’s offers', async () => {
    const res = await list(users.other, 'received')
    expect(res.body).toEqual([])
    const sent = await list(users.other, 'sent')
    expect(sent.body.map((o) => o.id)).toEqual([ctx.o3])
  })

  it('sent: listing is null once its seller turns it back into a draft', async () => {
    const listing = await insertListing(users.seller)
    const id = await insertOffer(listing, users.other, { status: 'declined' })
    await q(`UPDATE listings SET status = 'draft' WHERE id = $1`, [listing])
    const sent = await list(users.other, 'sent')
    expect(sent.body.find((o) => o.id === id).listing).toBeNull()
    // The seller still sees it in full.
    const received = await list(users.seller)
    expect(received.body.find((o) => o.id === id).listing.status).toBe('draft')
  })

  it('returns listing course codes in display order', async () => {
    const codes = ['WZO 202', 'WZO 101']
    await insertCourses(codes.map((code) => ({ code })))
    try {
      const listing = await insertListing(users.seller, {}, codes)
      const id = await insertOffer(listing, users.other, { status: 'withdrawn' })
      const res = await list(users.other, 'sent')
      expect(res.body.find((o) => o.id === id).listing.courseCodes).toEqual(codes)
    } finally {
      await q('DELETE FROM listing_courses WHERE course_code::text = ANY($1)', [codes])
      await deleteCourses(codes)
    }
  })
})
