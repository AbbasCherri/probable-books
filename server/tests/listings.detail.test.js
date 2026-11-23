// GET /api/listings/:id (requirements C2).
import { Router } from 'express'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import listingsDetail, { NOT_FOUND } from '../src/routes/listings.detail.js'
import {
  deleteCourses,
  deleteUsers,
  endPool,
  insertCourses,
  insertListing,
  insertUsers,
  makeApp,
  newTag,
  q,
} from './helpers/wazan.js'

// A later router standing in for Abbas's and Youssef's fixed-word routes.
const fixedWords = Router()
fixedWords.get('/listings/:word', (req, res) => res.json({ word: req.params.word }))

const app = makeApp(listingsDetail, fixedWords)
const COURSES = ['WZD 201', 'WZD 101']
let users

beforeAll(async () => {
  users = await insertUsers(newTag(), ['seller', 'viewer'])
  await insertCourses(COURSES.map((code) => ({ code })))
})
afterAll(async () => {
  await deleteUsers(users)
  await deleteCourses(COURSES)
  await endPool()
})

const get = (id, user) => {
  const r = request(app).get(`/api/listings/${id}`)
  return user ? r.set('x-test-user', user) : r
}

const LISTING_KEYS = [
  'author',
  'brand',
  'category',
  'condition',
  'conditionNotes',
  'courseCodes',
  'createdAt',
  'description',
  'edition',
  'featured',
  'id',
  'isbn',
  'model',
  'openToOffers',
  'photos',
  'pickupSpot',
  'priceCents',
  'retailCents',
  'seller',
  'sellerId',
  'status',
  'title',
  'updatedAt',
]
const SELLER_KEYS = [
  'activeListingCount',
  'id',
  'memberSince',
  'name',
  'usualPickupSpot',
  'yearOfStudy',
]

describe('GET /api/listings/:id', () => {
  it('returns the Listing detail shape, with courses and photos in order', async () => {
    const id = await insertListing(
      users.seller,
      { title: 'Organic Chemistry, 4th edition', retail_cents: 18900, price_cents: 4500 },
      COURSES,
    )
    await q(
      `UPDATE listings SET author = 'David Klein', isbn = '9781119659594',
         condition_notes = '{"Highlighting in ch. 1 to 6"}' WHERE id = $1`,
      [id],
    )
    await q(
      `INSERT INTO listing_photos (listing_id, position, url, alt) VALUES
         ($1, 1, 'https://img.test/back.jpg', ''), ($1, 0, 'https://img.test/cover.jpg', 'Cover')`,
      [id],
    )

    const res = await get(id)
    expect(res.status).toBe(200)
    expect(Object.keys(res.body).sort()).toEqual(LISTING_KEYS)
    expect(res.body).toMatchObject({
      id,
      title: 'Organic Chemistry, 4th edition',
      category: 'textbook',
      courseCodes: COURSES,
      author: 'David Klein',
      edition: null,
      isbn: '9781119659594',
      brand: null,
      model: null,
      condition: 'good',
      conditionNotes: ['Highlighting in ch. 1 to 6'],
      description: '',
      priceCents: 4500,
      retailCents: 18900,
      openToOffers: true,
      photos: [
        { url: 'https://img.test/cover.jpg', alt: 'Cover' },
        { url: 'https://img.test/back.jpg', alt: '' },
      ],
      pickupSpot: 'Main library entrance',
      status: 'active',
      featured: false,
      sellerId: users.seller,
    })
    expect(new Date(res.body.createdAt).toISOString()).toBe(res.body.createdAt)
    expect(new Date(res.body.updatedAt).toISOString()).toBe(res.body.updatedAt)
  })

  it('signed out: seller without email', async () => {
    const id = await insertListing(users.seller)
    const res = await get(id)
    expect(Object.keys(res.body.seller).sort()).toEqual(SELLER_KEYS)
    expect(res.body.seller).toMatchObject({
      id: users.seller,
      name: 'Test seller',
      memberSince: '2025-01-15T00:00:00.000Z',
      yearOfStudy: 2,
      usualPickupSpot: null,
    })
  })

  it('signed in: seller email is included', async () => {
    const id = await insertListing(users.seller)
    const res = await get(id, users.viewer)
    expect(res.body.seller.email).toBe(`${users.seller}@test.invalid`)
  })

  it('never includes password information', async () => {
    const id = await insertListing(users.seller)
    const res = await get(id, users.viewer)
    expect(JSON.stringify(res.body)).not.toMatch(/password/i)
  })

  it('activeListingCount counts the seller’s active listings, including this one', async () => {
    const [{ n }] = await q(
      `SELECT count(*)::int AS n FROM listings WHERE seller_id = $1 AND status = 'active'`,
      [users.seller],
    )
    const id = await insertListing(users.seller)
    await insertListing(users.seller, { status: 'sold' })
    await insertListing(users.seller, { status: 'draft' })
    const res = await get(id)
    expect(res.body.seller.activeListingCount).toBe(n + 1)
  })

  it('reserved and sold listings are visible to everyone', async () => {
    for (const status of ['reserved', 'sold']) {
      const id = await insertListing(users.seller, { status })
      const res = await get(id)
      expect(res.status, status).toBe(200)
      expect(res.body.status).toBe(status)
    }
  })

  it('a draft loads for its owner and is 404 for everyone else', async () => {
    const id = await insertListing(users.seller, { status: 'draft' })
    expect((await get(id, users.seller)).status).toBe(200)
    for (const viewer of [null, users.viewer]) {
      const res = await get(id, viewer)
      expect(res.status).toBe(404)
      expect(res.body).toEqual({ message: NOT_FOUND })
    }
  })

  it('an incomplete draft still loads for its owner, with nulls', async () => {
    const [{ id }] = await q(
      `INSERT INTO listings (seller_id, status) VALUES ($1, 'draft') RETURNING id`,
      [users.seller],
    )
    const res = await get(id, users.seller)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      title: null,
      category: null,
      condition: null,
      priceCents: null,
      pickupSpot: null,
      courseCodes: [],
      photos: [],
      conditionNotes: [],
    })
  })

  it('404 for an unknown id', async () => {
    const res = await get('lst_does_not_exist')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: NOT_FOUND })
  })

  it('hands featured, new and mine on to their own routes', async () => {
    for (const word of ['featured', 'new', 'mine']) {
      const res = await get(word)
      expect(res.body).toEqual({ word })
    }
  })
})
