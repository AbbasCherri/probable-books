// POST/PATCH/DELETE /api/listings and GET /api/listings/mine (requirements C3).
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MESSAGES, normalizeIsbn } from '../src/routes/listings.validate.js'
import {
  COURSES,
  endPool,
  insertListing,
  insertOffer,
  makeApp,
  q,
  setup,
  teardown,
} from './helpers/youssef.js'

const app = makeApp()
let users

beforeAll(async () => {
  ;({ users } = await setup())
})
afterAll(async () => {
  await teardown(users)
  await endPool()
})

const as = (user) => ({ 'x-test-user': user })
const post = (user, body) => request(app).post('/api/listings').set(as(user)).send(body)
const patch = (user, id, body) =>
  request(app).patch(`/api/listings/${id}`).set(as(user)).send(body)

const valid = () => ({
  title: '  Organic Chemistry, 4th edition  ',
  category: 'textbook',
  courseCodes: ['yxq101', 'YXQ-102', 'YXQ 101'],
  author: 'David Klein',
  edition: '4th edition',
  isbn: '978-1-119-65959-4',
  condition: 'good',
  conditionNotes: ['Yellow highlighting in chapters 1 to 6'],
  priceCents: 4500,
  retailCents: 14900,
  photos: [{ url: 'https://example.com/a.jpg', alt: 'Cover' }, { url: '/mock/b.svg' }],
  pickupSpot: 'Main library entrance',
})

describe('POST /api/listings', () => {
  it('401 without a signed-in user', async () => {
    const res = await request(app).post('/api/listings').send(valid())
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: 'Sign in to continue.' })
  })

  it('201 creates an active listing in the A6 shape, normalized', async () => {
    const res = await post(users.seller, {
      ...valid(),
      id: 'lst_hijack',
      sellerId: users.other,
      featured: true,
      createdAt: '2000-01-01T00:00:00.000Z',
    })
    expect(res.status).toBe(201)
    const l = res.body
    expect(l.id).toMatch(/^lst_/)
    expect(l.id).not.toBe('lst_hijack')
    expect(l).toMatchObject({
      title: 'Organic Chemistry, 4th edition',
      category: 'textbook',
      courseCodes: ['YXQ 101', 'YXQ 102'],
      author: 'David Klein',
      isbn: '9781119659594',
      brand: null,
      model: null,
      condition: 'good',
      description: '',
      priceCents: 4500,
      retailCents: 14900,
      openToOffers: true,
      photos: [
        { url: 'https://example.com/a.jpg', alt: 'Cover' },
        { url: '/mock/b.svg', alt: '' },
      ],
      pickupSpot: 'Main library entrance',
      status: 'active',
      featured: false,
      sellerId: users.seller,
    })
    expect(Date.now() - Date.parse(l.createdAt)).toBeLessThan(60_000)
    expect(l.updatedAt).toBe(l.createdAt)
  })

  it('defaults pickupSpot, openToOffers, notes, photos and status', async () => {
    const { pickupSpot: _p, photos: _ph, conditionNotes: _n, ...rest } = valid()
    const res = await post(users.seller, rest)
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      pickupSpot: 'Science building lobby',
      openToOffers: true,
      conditionNotes: [],
      photos: [],
      status: 'active',
    })
  })

  it('the same listing sent twice creates two listings', async () => {
    const a = await post(users.seller, valid())
    const b = await post(users.seller, valid())
    expect(a.status).toBe(201)
    expect(b.status).toBe(201)
    expect(a.body.id).not.toBe(b.body.id)
  })

  it('an incomplete draft saves', async () => {
    const res = await post(users.seller, { status: 'draft', title: 'Half done draft' })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      status: 'draft',
      title: 'Half done draft',
      category: null,
      condition: null,
      priceCents: null,
      courseCodes: [],
      pickupSpot: 'Science building lobby',
    })
  })

  it('a draft must still be valid in what it includes', async () => {
    const res = await post(users.seller, { status: 'draft', priceCents: 0, title: 'abc' })
    expect(res.status).toBe(422)
    expect(res.body.fields).toEqual({
      title: MESSAGES.titleShort,
      priceCents: MESSAGES.priceLow,
    })
  })

  it('reports every missing required field at once, in form order', async () => {
    const res = await post(users.seller, {})
    expect(res.status).toBe(422)
    expect(res.body.fields).toEqual({
      title: MESSAGES.titleMissing,
      category: MESSAGES.category,
      courseCodes: MESSAGES.coursesNone,
      condition: MESSAGES.condition,
      priceCents: MESSAGES.priceLow,
    })
    expect(res.body.message).toBe(Object.values(res.body.fields).join(' '))
  })

  it.each([['reserved'], ['sold']])('rejects status %s on create', async (status) => {
    const res = await post(users.seller, { ...valid(), status })
    expect(res.status).toBe(422)
    expect(res.body.fields).toEqual({
      status: 'New listings start as a draft or active.',
    })
  })

  // Every A8 listing rule, one field at a time: [field, value, expected message]
  it.each([
    ['title', '', MESSAGES.titleMissing],
    ['title', 'abcd', MESSAGES.titleShort],
    ['title', 'x'.repeat(121), MESSAGES.titleLong],
    ['category', 'furniture', MESSAGES.category],
    ['status', 'archived', MESSAGES.status],
    ['courseCodes', [], MESSAGES.coursesNone],
    ['courseCodes', COURSES, MESSAGES.coursesMany],
    ['courseCodes', ['CHEMISTRY 1'], MESSAGES.courseFormat],
    ['courseCodes', 'YXQ 101', MESSAGES.courseFormat],
    [
      'courseCodes',
      ['YXQ 101', 'zzzq 999'],
      'No ZZZQ 999 in the index. Pick a course from the list.',
    ],
    ['condition', 'mint', MESSAGES.condition],
    ['conditionNotes', ['a', 'b', 'c', 'd', 'e', 'f'], MESSAGES.notesMany],
    ['conditionNotes', ['x'.repeat(81)], MESSAGES.noteLong],
    ['conditionNotes', [42], MESSAGES.notesType],
    ['conditionNotes', 'one line', MESSAGES.notesType],
    ['photos', Array.from({ length: 7 }, () => ({ url: '/a.svg' })), MESSAGES.photosMany],
    ['photos', [{ alt: 'no url' }], MESSAGES.photoUrl],
    ['photos', [{ url: 'javascript:alert(1)' }], MESSAGES.photoUrl],
    ['priceCents', 0, MESSAGES.priceLow],
    ['priceCents', 12.5, MESSAGES.priceLow],
    ['priceCents', '1250', MESSAGES.priceLow],
    ['priceCents', 500_001, MESSAGES.priceHigh],
    ['retailCents', -5, MESSAGES.retailType],
    ['retailCents', 'lots', MESSAGES.retailType],
    ['retailCents', 4500, MESSAGES.retailLow],
    ['description', 'x'.repeat(1001), MESSAGES.description],
    ['isbn', '9781119659595', MESSAGES.isbn],
    ['isbn', '12345', MESSAGES.isbn],
    ['openToOffers', 'yes', MESSAGES.openToOffers],
    ['pickupSpot', 'My house', MESSAGES.pickupSpot],
    ['pickupSpot', null, MESSAGES.pickupSpot],
  ])('rejects %s = %j', async (field, value, message) => {
    const res = await post(users.seller, { ...valid(), [field]: value })
    expect(res.status).toBe(422)
    expect(res.body).toEqual({ message, fields: { [field]: message } })
  })

  it('accepts boundary values', async () => {
    const res = await post(users.seller, {
      ...valid(),
      title: 'abcde',
      priceCents: 500_000,
      retailCents: null,
      conditionNotes: ['x'.repeat(80), 'b', 'c', 'd', 'e'],
      description: 'x'.repeat(1000),
      courseCodes: COURSES.slice(0, 5),
      photos: Array.from({ length: 6 }, (_, i) => ({ url: `/p${i}.svg` })),
      isbn: '0-306-40615-2',
      openToOffers: false,
    })
    expect(res.status).toBe(201)
    expect(res.body.isbn).toBe('0306406152')
    expect(res.body.photos).toHaveLength(6)
    expect(res.body.photos[0].url).toBe('/p0.svg')
    expect(res.body.openToOffers).toBe(false)
  })
})

describe('normalizeIsbn', () => {
  it('checks ISBN-10 (including X) and ISBN-13 check digits', () => {
    expect(normalizeIsbn('080442957X')).toBe('080442957X')
    expect(normalizeIsbn('0 8044 2957 x')).toBe('080442957X')
    expect(normalizeIsbn('0804429570')).toBeNull()
    expect(normalizeIsbn('9780306406157')).toBe('9780306406157')
    expect(normalizeIsbn('9780306406158')).toBeNull()
  })
})

describe('PATCH /api/listings/:id', () => {
  let id
  beforeAll(async () => {
    id = (await post(users.seller, valid())).body.id
  })

  it('401 without a signed-in user', async () => {
    const res = await request(app).patch(`/api/listings/${id}`).send({ priceCents: 1 })
    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Sign in to continue.')
  })

  it('404 for a missing listing', async () => {
    const res = await patch(users.seller, 'lst_nope', { priceCents: 1 })
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'This page was torn out.' })
  })

  it("403 for someone else's posted listing; nothing changes", async () => {
    for (const body of [{ priceCents: 1 }, { status: 'sold' }]) {
      const res = await patch(users.other, id, body)
      expect(res.status).toBe(403)
      expect(res.body).toEqual({ message: 'That listing is not yours.' })
    }
    const [row] = await q('SELECT price_cents, status FROM listings WHERE id = $1', [id])
    expect(row).toEqual({ price_cents: 4500, status: 'active' })
  })

  it("404 for someone else's draft (drafts stay hidden)", async () => {
    const draft = (await post(users.seller, { status: 'draft' })).body.id
    expect((await patch(users.other, draft, { title: 'Stolen draft' })).status).toBe(404)
    expect(
      (await request(app).delete(`/api/listings/${draft}`).set(as(users.other))).status,
    ).toBe(404)
  })

  it('changes only what is sent and moves updatedAt', async () => {
    const before = (await q('SELECT updated_at FROM listings WHERE id = $1', [id]))[0]
    const res = await patch(users.seller, id, {
      priceCents: 4000,
      sellerId: users.other,
      featured: true,
    })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      priceCents: 4000,
      title: 'Organic Chemistry, 4th edition',
      courseCodes: ['YXQ 101', 'YXQ 102'],
      photos: [
        { url: 'https://example.com/a.jpg', alt: 'Cover' },
        { url: '/mock/b.svg', alt: '' },
      ],
      sellerId: users.seller,
      featured: false,
    })
    expect(Date.parse(res.body.updatedAt)).toBeGreaterThan(before.updated_at.getTime())
  })

  it('replaces course codes and photos when sent', async () => {
    const res = await patch(users.seller, id, {
      courseCodes: ['yxq-103'],
      photos: [{ url: '/new.svg', alt: 'New' }],
    })
    expect(res.status).toBe(200)
    expect(res.body.courseCodes).toEqual(['YXQ 103'])
    expect(res.body.photos).toEqual([{ url: '/new.svg', alt: 'New' }])
  })

  it('checks the listing as it would be after the change', async () => {
    // Retail is 14900; raising the price above it breaks the retail rule.
    const res = await patch(users.seller, id, { priceCents: 20_000 })
    expect(res.status).toBe(422)
    expect(res.body.fields).toEqual({ retailCents: MESSAGES.retailLow })
  })

  it('moves through every status (reserve, sell, relist, back to draft)', async () => {
    for (const status of ['reserved', 'sold', 'active', 'draft', 'active']) {
      const res = await patch(users.seller, id, { status })
      expect(res.status).toBe(200)
      expect(res.body.status).toBe(status)
    }
    const bad = await patch(users.seller, id, { status: 'gone' })
    expect(bad.status).toBe(422)
    expect(bad.body.fields).toEqual({ status: MESSAGES.status })
  })

  it('an incomplete draft cannot be published, then can once complete', async () => {
    const draft = (
      await post(users.seller, { status: 'draft', title: 'Calculator TI-84' })
    ).body.id
    const res = await patch(users.seller, draft, { status: 'active' })
    expect(res.status).toBe(422)
    expect(res.body.fields).toEqual({
      category: MESSAGES.category,
      courseCodes: MESSAGES.coursesNone,
      condition: MESSAGES.condition,
      priceCents: MESSAGES.priceLow,
    })
    const ok = await patch(users.seller, draft, {
      status: 'active',
      category: 'calculator',
      courseCodes: ['YXQ 104'],
      condition: 'like_new',
      priceCents: 6000,
    })
    expect(ok.status).toBe(200)
    expect(ok.body.status).toBe('active')
  })

  it('changing status does not touch offers', async () => {
    const lst = await insertListing(users.seller)
    const off = await insertOffer(lst, users.buyer)
    expect((await patch(users.seller, lst, { status: 'sold' })).status).toBe(200)
    const [row] = await q('SELECT status FROM offers WHERE id = $1', [off])
    expect(row.status).toBe('pending')
  })
})

describe('DELETE /api/listings/:id', () => {
  it('401, 404, 403, then 204 and the offers go with it', async () => {
    const lst = await insertListing(users.seller)
    const off = await insertOffer(lst, users.buyer)
    const del = (user, lid = lst) => {
      const r = request(app).delete(`/api/listings/${lid}`)
      return user ? r.set(as(user)) : r
    }
    expect((await del(null)).status).toBe(401)
    expect((await del(users.seller, 'lst_nope')).body).toEqual({
      message: 'This page was torn out.',
    })
    const forbidden = await del(users.other)
    expect(forbidden.status).toBe(403)
    expect(forbidden.body).toEqual({ message: 'That listing is not yours.' })

    const res = await del(users.seller)
    expect(res.status).toBe(204)
    expect(res.text).toBe('')
    expect(await q('SELECT 1 FROM listings WHERE id = $1', [lst])).toHaveLength(0)
    expect(await q('SELECT 1 FROM offers WHERE id = $1', [off])).toHaveLength(0)
  })
})

describe('GET /api/listings/mine', () => {
  it('401 without a signed-in user', async () => {
    const res = await request(app).get('/api/listings/mine')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: 'Sign in to continue.' })
  })

  it('[] when the user has no listings', async () => {
    const res = await request(app).get('/api/listings/mine').set(as(users.buyer2))
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('every status incl. drafts, newest first, with pending offerCount', async () => {
    const user = users.other
    const older = await insertListing(user, { status: 'sold' })
    await q(`UPDATE listings SET created_at = now() - interval '1 day' WHERE id = $1`, [
      older,
    ])
    const draft = (await post(user, { status: 'draft' })).body.id
    const active = await insertListing(user)
    await insertOffer(active, users.buyer)
    await insertOffer(active, users.buyer2)
    await insertOffer(active, users.seller, { status: 'declined' })

    const res = await request(app).get('/api/listings/mine').set(as(user))
    expect(res.status).toBe(200)
    expect(res.body.map((l) => l.id)).toEqual([active, draft, older])
    expect(res.body.map((l) => l.offerCount)).toEqual([2, 0, 0])
    expect(res.body.every((l) => l.sellerId === user)).toBe(true)
  })
})
