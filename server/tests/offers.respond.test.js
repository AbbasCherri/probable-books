// PATCH /api/offers/:id (requirements C3, "Offer actions: who can do what").
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { OFFER_MESSAGES as M } from '../src/routes/offers.respond.js'
import {
  endPool,
  insertListing,
  insertOffer,
  makeApp,
  q,
  setup,
  teardown,
} from './helpers/youssef.js'

const app = makeApp()
let users, seller, buyer

beforeAll(async () => {
  ;({ users } = await setup())
  ;({ seller, buyer } = users)
})
afterAll(async () => {
  await teardown(users)
  await endPool()
})

const respond = (user, id, body) => {
  const r = request(app).patch(`/api/offers/${id}`)
  return (user ? r.set('x-test-user', user) : r).send(body)
}
const listingStatus = async (id) =>
  (await q('SELECT status FROM listings WHERE id = $1', [id]))[0].status

/** A fresh active listing (asking 5000) with one offer (3000) in the given state. */
async function fresh(offerStatus = 'pending', counter = null) {
  const listing = await insertListing(seller)
  const offer = await insertOffer(listing, buyer, {
    status: offerStatus,
    counter_cents: counter ?? (offerStatus === 'countered' ? 4000 : null),
  })
  return { listing, offer }
}

describe('every row of the offer actions table', () => {
  it('1. seller accepts a pending offer: accepted, listing reserved', async () => {
    const { listing, offer } = await fresh()
    const res = await respond(seller, offer, { action: 'accept' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      id: offer,
      listingId: listing,
      buyerId: buyer,
      amountCents: 3000,
      message: '',
      status: 'accepted',
      counterCents: null,
    })
    expect(Object.keys(res.body).sort()).toEqual(
      [
        'id',
        'listingId',
        'buyerId',
        'amountCents',
        'message',
        'status',
        'counterCents',
        'createdAt',
      ].sort(),
    )
    expect(await listingStatus(listing)).toBe('reserved')
  })

  it('2. seller declines a pending offer, even when the listing is reserved', async () => {
    const { listing, offer } = await fresh()
    await q(`UPDATE listings SET status = 'reserved' WHERE id = $1`, [listing])
    const res = await respond(seller, offer, { action: 'decline' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('declined')
    expect(await listingStatus(listing)).toBe('reserved')
  })

  it('3. seller counters a pending offer: countered, counterCents set', async () => {
    const { listing, offer } = await fresh()
    const res = await respond(seller, offer, { action: 'counter', counterCents: 4200 })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'countered', counterCents: 4200 })
    expect(await listingStatus(listing)).toBe('active')
  })

  it('4. buyer withdraws a pending offer', async () => {
    const { offer } = await fresh()
    const res = await respond(buyer, offer, { action: 'withdraw' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('withdrawn')
  })

  it('5. buyer accepts a counter: accepted at the counter price, listing reserved', async () => {
    const { listing, offer } = await fresh('countered', 4000)
    const res = await respond(buyer, offer, { action: 'accept' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'accepted', counterCents: 4000 })
    expect(await listingStatus(listing)).toBe('reserved')
  })

  it('6. buyer declines a counter', async () => {
    const { listing, offer } = await fresh('countered')
    const res = await respond(buyer, offer, { action: 'decline' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('declined')
    expect(await listingStatus(listing)).toBe('active')
  })

  it('7. buyer withdraws a countered offer', async () => {
    const { offer } = await fresh('countered')
    const res = await respond(buyer, offer, { action: 'withdraw' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('withdrawn')
  })

  it.each(['countered', 'accepted', 'declined', 'withdrawn'])(
    '8. seller acting on a %s offer: 422 no longer open',
    async (state) => {
      const { offer } = await fresh(state, state === 'countered' ? 4000 : null)
      for (const action of ['accept', 'decline', 'counter']) {
        const res = await respond(seller, offer, { action, counterCents: 4500 })
        expect(res.status).toBe(422)
        expect(res.body).toEqual({ message: M.notOpen })
      }
    },
  )

  it.each(['accepted', 'declined', 'withdrawn'])(
    '9. buyer acting on a %s offer: 422 no longer open',
    async (state) => {
      const { offer } = await fresh(state)
      for (const action of ['accept', 'decline', 'withdraw']) {
        const res = await respond(buyer, offer, { action })
        expect(res.status).toBe(422)
        expect(res.body).toEqual({ message: M.notOpen })
      }
    },
  )

  it('10. anyone else: 403 not yours, whatever the action', async () => {
    const { offer } = await fresh()
    for (const action of ['accept', 'decline', 'counter', 'withdraw', 'nonsense']) {
      const res = await respond(users.other, offer, { action })
      expect(res.status).toBe(403)
      expect(res.body).toEqual({ message: M.notYours })
    }
  })
})

describe('other failures', () => {
  it('401 when not signed in', async () => {
    const { offer } = await fresh()
    const res = await respond(null, offer, { action: 'accept' })
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: 'Sign in to continue.' })
  })

  it('404 for a missing offer', async () => {
    const res = await respond(seller, 'off_nope', { action: 'accept' })
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'Offer not found.' })
  })

  it('403 role rules', async () => {
    const { offer } = await fresh()
    const cases = [
      [buyer, 'counter', M.sellerOnlyCounter],
      [buyer, 'accept', M.sellerOnlyDecide],
      [buyer, 'decline', M.sellerOnlyDecide],
      [seller, 'withdraw', M.buyerOnlyWithdraw],
    ]
    for (const [user, action, message] of cases) {
      const res = await respond(user, offer, { action, counterCents: 4000 })
      expect(res.status).toBe(403)
      expect(res.body).toEqual({ message })
    }
    const [row] = await q('SELECT status FROM offers WHERE id = $1', [offer])
    expect(row.status).toBe('pending')
  })

  it('422 unknown or missing action', async () => {
    const { offer } = await fresh()
    for (const body of [{ action: 'haggle' }, {}]) {
      const res = await respond(seller, offer, body)
      expect(res.status).toBe(422)
      expect(res.body).toEqual({ message: 'Unknown action.' })
    }
  })

  it.each([
    ['reserved', M.reserved],
    ['sold', M.sold],
    ['draft', M.draft],
  ])('422 accepting when the listing is %s; nothing changes', async (status, message) => {
    const { listing, offer } = await fresh()
    await q('UPDATE listings SET status = $2 WHERE id = $1', [listing, status])
    const res = await respond(seller, offer, { action: 'accept' })
    expect(res.status).toBe(422)
    expect(res.body).toEqual({ message })
    const [row] = await q('SELECT status FROM offers WHERE id = $1', [offer])
    expect(row.status).toBe('pending')
    expect(await listingStatus(listing)).toBe(status)
  })

  it('422 buyer accepting a counter when the listing is no longer active', async () => {
    const { listing, offer } = await fresh('countered')
    await q(`UPDATE listings SET status = 'sold' WHERE id = $1`, [listing])
    const res = await respond(buyer, offer, { action: 'accept' })
    expect(res.status).toBe(422)
    expect(res.body).toEqual({ message: M.sold })
  })

  it.each([[3000], [5000], [2000], [4000.5], ['4000'], [undefined]])(
    '422 bad counter amount %j (offer 3000, asking 5000)',
    async (counterCents) => {
      const { offer } = await fresh()
      const res = await respond(seller, offer, { action: 'counter', counterCents })
      expect(res.status).toBe(422)
      expect(res.body).toEqual({
        message: M.counter,
        fields: { counterCents: M.counter },
      })
    },
  )

  it('accepting never changes other offers on the listing', async () => {
    const { listing, offer } = await fresh()
    const other = await insertOffer(listing, users.buyer2)
    expect((await respond(seller, offer, { action: 'accept' })).status).toBe(200)
    const [row] = await q('SELECT status FROM offers WHERE id = $1', [other])
    expect(row.status).toBe('pending')
    // The seller can still decline the other one while the listing is reserved.
    const res = await respond(seller, other, { action: 'decline' })
    expect(res.status).toBe(200)
  })
})

describe('concurrency', () => {
  it('two simultaneous accepts on one listing: one accepted, one rejected', async () => {
    const { listing, offer } = await fresh()
    const second = await insertOffer(listing, users.buyer2)
    const results = await Promise.all([
      respond(seller, offer, { action: 'accept' }),
      respond(seller, second, { action: 'accept' }),
    ])
    const codes = results.map((r) => r.status).sort()
    expect(codes).toEqual([200, 422])
    const loser = results.find((r) => r.status === 422)
    expect(loser.body).toEqual({ message: M.reserved })
    const rows = await q(
      `SELECT count(*)::int AS n FROM offers WHERE listing_id = $1 AND status = 'accepted'`,
      [listing],
    )
    expect(rows[0].n).toBe(1)
    expect(await listingStatus(listing)).toBe('reserved')
  })

  it('two simultaneous responses to one offer: exactly one wins', async () => {
    const { offer } = await fresh()
    const results = await Promise.all([
      respond(seller, offer, { action: 'decline' }),
      respond(buyer, offer, { action: 'withdraw' }),
    ])
    expect(results.map((r) => r.status).sort()).toEqual([200, 422])
  })
})
