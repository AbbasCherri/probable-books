// Test fixtures for listings.detail, courses and offers.create (owner: Wazan).
// Runs against the real database in DATABASE_URL (CI: the postgres service, after migrate).
// Every row uses a per-run tag so parallel test files never collide.
import express from 'express'
import { pool } from '../../src/db/pool.js'

/**
 * The given routers mounted like the real app (/api). Auth is stubbed: the x-test-user
 * header stands in for a verified token (Ayk's middleware sets req.user).
 */
export function makeApp(...routers) {
  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => {
    const id = req.get('x-test-user')
    if (id) req.user = { id }
    next()
  })
  for (const router of routers) app.use('/api', router)
  app.use((err, _req, res, _next) => {
    console.error(err)
    res.status(500).json({ message: 'Something went wrong. Try again.' })
  })
  return app
}

/** A short random tag, unique per test run. */
export const newTag = () =>
  `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** Insert users named after `names`; returns { name: id }. */
export async function insertUsers(tag, names) {
  const users = {}
  for (const name of names) {
    const id = `usr_${tag}_${name}`
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, year_of_study, created_at)
       VALUES ($1, $2, $3, 'x', 2, '2025-01-15T00:00:00Z')`,
      [id, `Test ${name}`, `${id}@test.invalid`],
    )
    users[name] = id
  }
  return users
}

/** Insert courses (codes like 'WZA 101'); test codes are deleted by deleteCourses. */
export async function insertCourses(courses) {
  for (const c of courses) {
    await pool.query(
      `INSERT INTO courses (code, title, required_materials, tips, related_codes)
       VALUES ($1, $2, $3::jsonb, $4, $5) ON CONFLICT DO NOTHING`,
      [
        c.code,
        c.title ?? `Test course ${c.code}`,
        JSON.stringify(c.requiredMaterials ?? []),
        c.tips ?? [],
        c.relatedCodes ?? [],
      ],
    )
  }
}

export async function deleteCourses(codes) {
  await pool.query('DELETE FROM courses WHERE code::text = ANY($1::text[])', [codes])
}

/** Insert a listing directly (bypassing the API). `courses` are tagged in order. */
export async function insertListing(sellerId, overrides = {}, courses = []) {
  const v = {
    title: 'Test listing title',
    category: 'textbook',
    condition: 'good',
    price_cents: 5000,
    retail_cents: null,
    pickup_spot: 'Main library entrance',
    status: 'active',
    open_to_offers: true,
    ...overrides,
  }
  const { rows } = await pool.query(
    `INSERT INTO listings (seller_id, title, category, condition, price_cents, retail_cents,
       pickup_spot, status, open_to_offers)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [
      sellerId,
      v.title,
      v.category,
      v.condition,
      v.price_cents,
      v.retail_cents,
      v.pickup_spot,
      v.status,
      v.open_to_offers,
    ],
  )
  const id = rows[0].id
  for (const [i, code] of courses.entries()) {
    await pool.query(
      'INSERT INTO listing_courses (listing_id, position, course_code) VALUES ($1, $2, $3)',
      [id, i, code],
    )
  }
  return id
}

export async function insertOffer(listingId, buyerId, overrides = {}) {
  const v = {
    amount_cents: 3000,
    message: '',
    status: 'pending',
    counter_cents: null,
    ...overrides,
  }
  const { rows } = await pool.query(
    `INSERT INTO offers (listing_id, buyer_id, amount_cents, message, status, counter_cents)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [listingId, buyerId, v.amount_cents, v.message, v.status, v.counter_cents],
  )
  return rows[0].id
}

/** Users cascade to their listings and offers. */
export async function deleteUsers(users) {
  await pool.query('DELETE FROM users WHERE id = ANY($1::text[])', [Object.values(users)])
}

export async function endPool() {
  await pool.end()
}

export const q = (sql, params) => pool.query(sql, params).then((r) => r.rows)
