// Owner: Youssef (@yousefelezzi)
// Endpoints: POST /listings, PATCH /listings/:id, DELETE /listings/:id, GET /listings/mine
//
// Mount this router before the listing-detail router (GET /listings/:id), otherwise
// "/listings/mine" is read as a listing id.

import { Router } from 'express'
import { pool, withTransaction } from '../db/pool.js'
import { DEFAULT_PICKUP_SPOT, WRITABLE, validateListing } from './listings.validate.js'

const router = Router()

export const SIGN_IN = 'Sign in to continue.'
export const NOT_FOUND = 'This page was torn out.'
const NOT_YOURS = 'That listing is not yours.'

/**
 * Ayk's auth middleware (middleware/auth.js) verifies the token and sets req.user = { id }.
 * This guard only turns "no user" into the A3 401, so it is safe whichever way that
 * middleware ends up being mounted.
 */
export function signedIn(req, res, next) {
  if (!req.user?.id) return res.status(401).json({ message: SIGN_IN })
  next()
}

/** A4: 422 with one entry per bad field; message is the entries joined by a space. */
export function invalid(res, fields) {
  return res.status(422).json({ message: Object.values(fields).join(' '), fields })
}

// ---------------------------------------------------------------------------------------
// Reading listings in the A6 shape
// ---------------------------------------------------------------------------------------

// Courses and photos come back already ordered by position. course_code is a domain, so it
// is cast to text to get a plain text[] that node-postgres parses into a JS array.
const LISTING_SELECT = `
  SELECT l.*,
    COALESCE((SELECT array_agg(lc.course_code::text ORDER BY lc.position)
                FROM listing_courses lc WHERE lc.listing_id = l.id), '{}') AS course_codes,
    COALESCE((SELECT json_agg(json_build_object('url', p.url, 'alt', p.alt) ORDER BY p.position)
                FROM listing_photos p WHERE p.listing_id = l.id), '[]') AS photos
  FROM listings l`

/** Database row -> Listing (A6). */
export function toListing(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    courseCodes: row.course_codes,
    author: row.author,
    edition: row.edition,
    isbn: row.isbn,
    brand: row.brand,
    model: row.model,
    condition: row.condition,
    conditionNotes: row.condition_notes,
    description: row.description,
    priceCents: row.price_cents,
    retailCents: row.retail_cents,
    openToOffers: row.open_to_offers,
    photos: row.photos,
    pickupSpot: row.pickup_spot,
    status: row.status,
    featured: row.featured,
    sellerId: row.seller_id,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

async function loadListing(db, id) {
  const { rows } = await db.query(`${LISTING_SELECT} WHERE l.id = $1`, [id])
  return rows[0] ? toListing(rows[0]) : null
}

/** Resolves to the codes (already normalized) that exist in the course index. */
const courseExists = (db) => async (codes) => {
  const { rows } = await db.query(
    'SELECT code::text AS code FROM courses WHERE code::text = ANY($1::text[])',
    [codes],
  )
  return rows.map((r) => r.code)
}

/** Insert the ordered course and photo rows for a listing (after clearing old ones). */
async function writeChildren(db, id, values) {
  await db.query('DELETE FROM listing_courses WHERE listing_id = $1', [id])
  await db.query('DELETE FROM listing_photos WHERE listing_id = $1', [id])
  if (values.courseCodes.length) {
    await db.query(
      `INSERT INTO listing_courses (listing_id, position, course_code)
       SELECT $1, ord - 1, code FROM unnest($2::text[]) WITH ORDINALITY AS t(code, ord)`,
      [id, values.courseCodes],
    )
  }
  if (values.photos.length) {
    await db.query(
      `INSERT INTO listing_photos (listing_id, position, url, alt)
       SELECT $1, ord - 1, url, alt
       FROM unnest($2::text[], $3::text[]) WITH ORDINALITY AS t(url, alt, ord)`,
      [id, values.photos.map((p) => p.url), values.photos.map((p) => p.alt)],
    )
  }
}

// Column order matches the parameter list built by columnValues().
const COLUMNS = [
  'title',
  'category',
  'condition',
  'price_cents',
  'pickup_spot',
  'author',
  'edition',
  'isbn',
  'brand',
  'model',
  'condition_notes',
  'description',
  'retail_cents',
  'open_to_offers',
  'status',
]
const columnValues = (v) => [
  v.title,
  v.category,
  v.condition,
  v.priceCents,
  v.pickupSpot,
  v.author,
  v.edition,
  v.isbn,
  v.brand,
  v.model,
  v.conditionNotes,
  v.description,
  v.retailCents,
  v.openToOffers,
  v.status,
]

/** Only the properties a client may set; server-owned ones are dropped here. */
function pickWritable(body) {
  const out = {}
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    for (const key of WRITABLE) if (key in body) out[key] = body[key]
  }
  return out
}

// ---------------------------------------------------------------------------------------
// GET /listings/mine
// ---------------------------------------------------------------------------------------

/**
 * @openapi
 * /listings/mine:
 *   get:
 *     tags: [Listings]
 *     summary: The signed-in user's listings (every status, drafts included)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: My listing list, newest created first. offerCount = pending offers.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Listing'
 *                   - type: object
 *                     properties: { offerCount: { type: integer } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/listings/mine', signedIn, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT x.*,
       (SELECT count(*)::int FROM offers o
         WHERE o.listing_id = x.id AND o.status = 'pending') AS offer_count
     FROM (${LISTING_SELECT} WHERE l.seller_id = $1) x
     ORDER BY x.created_at DESC, x.id DESC`,
    [req.user.id],
  )
  res.json(rows.map((r) => ({ ...toListing(r), offerCount: r.offer_count })))
})

// ---------------------------------------------------------------------------------------
// POST /listings
// ---------------------------------------------------------------------------------------

/**
 * @openapi
 * /listings:
 *   post:
 *     tags: [Listings]
 *     summary: Create a listing (or save a draft) owned by the signed-in user
 *     description: |
 *       Required unless status is draft: title, category, courseCodes (1 to 5), condition,
 *       priceCents. pickupSpot defaults to "Science building lobby". Default status is active;
 *       only draft or active are allowed. Every problem is reported at once.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ListingInput' }
 *     responses:
 *       201:
 *         description: The created Listing (featured false, sellerId = caller)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Listing' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       422:
 *         description: |
 *           A rule from A5 is broken; fields has one A8 message per field. A reserved or
 *           sold status gives fields.status "New listings start as a draft or active."
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/listings', signedIn, async (req, res) => {
  const input = pickWritable(req.body)
  if (input.pickupSpot === undefined) input.pickupSpot = DEFAULT_PICKUP_SPOT

  const { values, fields } = await validateListing(input, {
    create: true,
    courseExists: courseExists(pool),
  })
  if (Object.keys(fields).length) return invalid(res, fields)

  const listing = await withTransaction(async (db) => {
    const params = columnValues(values)
    const { rows } = await db.query(
      `INSERT INTO listings (seller_id, ${COLUMNS.join(', ')})
       VALUES ($1, ${COLUMNS.map((_, i) => `$${i + 2}`).join(', ')})
       RETURNING id`,
      [req.user.id, ...params],
    )
    await writeChildren(db, rows[0].id, values)
    return loadListing(db, rows[0].id)
  })
  res.status(201).json(listing)
})

// ---------------------------------------------------------------------------------------
// Ownership check shared by PATCH and DELETE
// ---------------------------------------------------------------------------------------

/**
 * Lock the listing row and check the caller owns it. Someone else's draft is a 404 (drafts
 * must not be discoverable); someone else's posted listing is a 403.
 * Returns the row, or sends the failure and returns null.
 */
async function lockOwned(db, req, res) {
  const { rows } = await db.query(
    'SELECT id, seller_id, status FROM listings WHERE id = $1 FOR UPDATE',
    [req.params.id],
  )
  const row = rows[0]
  const mine = row && row.seller_id === req.user.id
  if (!row || (!mine && row.status === 'draft')) {
    res.status(404).json({ message: NOT_FOUND })
    return null
  }
  if (!mine) {
    res.status(403).json({ message: NOT_YOURS })
    return null
  }
  return row
}

// ---------------------------------------------------------------------------------------
// PATCH /listings/:id
// ---------------------------------------------------------------------------------------

/**
 * @openapi
 * /listings/{id}:
 *   patch:
 *     tags: [Listings]
 *     summary: Edit, publish, reserve, mark sold or relist your listing
 *     description: |
 *       Send only what changes. The whole listing as it would be after the change is
 *       checked, using draft rules only if the resulting status is draft (so an incomplete
 *       draft cannot be published). Changing status does not touch offers.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ListingInput' }
 *     responses:
 *       200:
 *         description: The full updated Listing, updatedAt = now
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Listing' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: 'That listing is not yours.' }
 *       404: { description: 'This page was torn out. (missing, or someone else''s draft)' }
 *       422:
 *         description: A rule is broken (fields per A8)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.patch('/listings/:id', signedIn, async (req, res) => {
  const changes = pickWritable(req.body)

  const result = await withTransaction(async (db) => {
    if (!(await lockOwned(db, req, res))) return null
    const current = await loadListing(db, req.params.id)

    // Lay the changes over the listing as it is now, then check the whole result.
    const merged = {}
    for (const key of WRITABLE) merged[key] = key in changes ? changes[key] : current[key]
    const { values, fields } = await validateListing(merged, {
      create: false,
      courseExists: courseExists(db),
    })
    if (Object.keys(fields).length) {
      invalid(res, fields)
      return null
    }

    // Always run the UPDATE so the trigger moves updatedAt to now, even for an empty change.
    await db.query(
      `UPDATE listings SET ${COLUMNS.map((c, i) => `${c} = $${i + 2}`).join(', ')}
       WHERE id = $1`,
      [req.params.id, ...columnValues(values)],
    )
    if ('courseCodes' in changes || 'photos' in changes) {
      await writeChildren(db, req.params.id, values)
    }
    return loadListing(db, req.params.id)
  })
  if (result) res.json(result)
})

// ---------------------------------------------------------------------------------------
// DELETE /listings/:id
// ---------------------------------------------------------------------------------------

/**
 * @openapi
 * /listings/{id}:
 *   delete:
 *     tags: [Listings]
 *     summary: Permanently delete your listing and every offer on it
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       204: { description: Deleted }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: 'That listing is not yours.' }
 *       404: { description: 'This page was torn out.' }
 */
router.delete('/listings/:id', signedIn, async (req, res) => {
  const done = await withTransaction(async (db) => {
    if (!(await lockOwned(db, req, res))) return false
    // Offers, courses and photos go with it (ON DELETE CASCADE in the schema).
    await db.query('DELETE FROM listings WHERE id = $1', [req.params.id])
    return true
  })
  if (done) res.status(204).end()
})

export default router
