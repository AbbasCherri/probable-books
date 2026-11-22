// Test fixtures for listings.write and offers.respond (owner: Youssef).
// Runs against the real database in DATABASE_URL (CI: the postgres service, after migrate).
// Every row uses a per-run prefix so parallel test files never collide.
import express from 'express'
import { pool } from '../../src/db/pool.js'
import listingsWrite from '../../src/routes/listings.write.js'
import offersRespond from '../../src/routes/offers.respond.js'

/**
 * The routers under test, mounted like the real app (/api). Auth is stubbed: the
 * x-test-user header stands in for a verified token (Ayk's middleware sets req.user).
 */
export function makeApp() {
  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => {
    const id = req.get('x-test-user')
    if (id) req.user = { id }
    next()
  })
  app.use('/api', listingsWrite)
  app.use('/api', offersRespond)
  app.use((err, _req, res, _next) => {
    console.error(err)
    res.status(500).json({ message: 'Something went wrong. Try again.' })
  })
  return app
}

// Test-only course codes (2 to 4 letters, so they fit the course_code domain).
export const COURSES = ['YXQ 101', 'YXQ 102', 'YXQ 103', 'YXQ 104', 'YXQ 105', 'YXQ 106']

export async function setup() {
  const tag = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const users = {}
  for (const name of ['seller', 'buyer', 'buyer2', 'other']) {
    const id = `usr_${tag}_${name}`
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, 'x')`,
      [id, name, `${id}@test.invalid`],
    )
    users[name] = id
  }
  await pool.query(
    `INSERT INTO courses (code, title) SELECT c, 'Test course ' || c FROM unnest($1::text[]) c
     ON CONFLICT DO NOTHING`,
    [COURSES],
  )
  return { tag, users }
}

export async function teardown(users) {
  // Listings and offers cascade with their users.
  await pool.query('DELETE FROM users WHERE id = ANY($1::text[])', [Object.values(users)])
}

export async function endPool() {
  await pool.end()
}

/** Insert a listing directly (bypassing the API) for offer tests. */
export async function insertListing(sellerId, overrides = {}) {
  const v = {
    title: 'Test listing title',
    category: 'textbook',
    condition: 'good',
    price_cents: 5000,
    pickup_spot: 'Main library entrance',
    status: 'active',
    open_to_offers: true,
    ...overrides,
  }
  const { rows } = await pool.query(
    `INSERT INTO listings (seller_id, title, category, condition, price_cents, pickup_spot,
       status, open_to_offers)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [
      sellerId,
      v.title,
      v.category,
      v.condition,
      v.price_cents,
      v.pickup_spot,
      v.status,
      v.open_to_offers,
    ],
  )
  // A posted listing always has at least one course (PATCH re-checks the whole listing).
  await pool.query(
    `INSERT INTO listing_courses (listing_id, position, course_code) VALUES ($1, 0, $2)`,
    [rows[0].id, COURSES[0]],
  )
  return rows[0].id
}

export async function insertOffer(listingId, buyerId, overrides = {}) {
  const v = { amount_cents: 3000, status: 'pending', counter_cents: null, ...overrides }
  const { rows } = await pool.query(
    `INSERT INTO offers (listing_id, buyer_id, amount_cents, status, counter_cents)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [listingId, buyerId, v.amount_cents, v.status, v.counter_cents],
  )
  return rows[0].id
}

export const q = (sql, params) => pool.query(sql, params).then((r) => r.rows)
