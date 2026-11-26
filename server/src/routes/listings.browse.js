// Owner: Abbas (@AbbasCherri)
// Endpoints: GET /listings, GET /listings/featured, GET /listings/new

import { Router } from 'express'
import { pool } from '../db/pool.js'
import { normalizeCourseCode } from '../lib/courseCodes.js'
import { LISTING_COLUMNS, toListing } from '../lib/listings.js'
import { int, list, one } from '../lib/query.js'

const router = Router()

const CATEGORIES = new Set(['textbook', 'calculator', 'lab_gear', 'other'])
const CONDITIONS = new Set(['new', 'like_new', 'good', 'fair', 'worn'])
const PAGE_SIZE = 24
const MAX_PAGE_SIZE = 100

// Every sort ends with "newest, then id" so the order is total: paging never repeats or
// skips a listing. The condition enum is declared best to worst, so ASC is best first.
const TIEBREAK = 'l.created_at DESC, l.id ASC'
const ORDER_BY = {
  newest: TIEBREAK,
  price_asc: `l.price_cents ASC, ${TIEBREAK}`,
  price_desc: `l.price_cents DESC, ${TIEBREAK}`,
  condition: `l.condition ASC, ${TIEBREAK}`,
}

/** Escapes LIKE wildcards so a search for "50%" matches the text "50%". */
const likeEscape = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`)

/**
 * Turns the query string into one WHERE clause. Unknown values are dropped, and a filter
 * whose values are all unknown is not applied. Different filters AND together; several
 * values of one filter OR together (= ANY).
 */
async function buildFilters(query) {
  const where = [`l.status <> 'draft'`]
  const params = []
  const add = (value) => {
    params.push(value)
    return `$${params.length}`
  }

  const q = one(query.q)
  if (typeof q === 'string' && q.trim()) {
    // search_text is the lower-cased title, author, isbn, brand and model (see migration).
    const needle = add(likeEscape(q.trim().toLowerCase()))
    where.push(`l.search_text LIKE '%' || ${needle} || '%'`)
  }

  const codes = [...new Set(list(query.course).map(normalizeCourseCode).filter(Boolean))]
  if (codes.length) {
    // Only codes that exist in the course index count; unknown codes are ignored.
    const known = await pool.query(
      'SELECT code::text FROM courses WHERE code = ANY($1::text[])',
      [codes],
    )
    if (known.rows.length) {
      const any = add(known.rows.map((r) => r.code))
      where.push(`EXISTS (SELECT 1 FROM listing_courses lc
                  WHERE lc.listing_id = l.id AND lc.course_code = ANY(${any}::text[]))`)
    }
  }

  const categories = list(query.category).filter((c) => CATEGORIES.has(c))
  if (categories.length) where.push(`l.category::text = ANY(${add(categories)}::text[])`)

  const conditions = list(query.condition).filter((c) => CONDITIONS.has(c))
  if (conditions.length) where.push(`l.condition::text = ANY(${add(conditions)}::text[])`)

  let min = int(query.minPrice)
  let max = int(query.maxPrice)
  if (min !== null && max !== null && min > max) [min, max] = [max, min]
  if (min !== null) where.push(`l.price_cents >= ${add(min)}`)
  if (max !== null) where.push(`l.price_cents <= ${add(max)}`)

  if (one(query.openToOffers) === 'true') where.push('l.open_to_offers')

  return { where: where.join(' AND '), params }
}

/** Reads sort, page and pageSize, falling back to the defaults for missing or bad values. */
function paging(query) {
  const sortIn = one(query.sort)
  const sort = Object.hasOwn(ORDER_BY, sortIn) ? sortIn : 'newest'
  const pageIn = int(query.page)
  const page = pageIn !== null && pageIn >= 1 ? pageIn : 1
  const sizeIn = int(query.pageSize)
  const pageSize =
    sizeIn !== null && sizeIn >= 1 ? Math.min(sizeIn, MAX_PAGE_SIZE) : PAGE_SIZE
  return { sort, page, pageSize }
}

/**
 * @openapi
 * /api/listings:
 *   get:
 *     tags: [Listings]
 *     summary: Search and filter the marketplace
 *     description: |
 *       Powers Browse and the listings on Course Details. Drafts are never returned;
 *       active, reserved and sold listings are.
 *       Different filters combine with AND; several values of one filter combine with OR.
 *       List filters may be repeated (`course=CHEM-201&course=BIOL-201`) or comma-separated.
 *       Unknown values in course, category, condition and sort are ignored, so this
 *       endpoint has no failure cases of its own. Every sort breaks ties by newest, then
 *       id, so paging never repeats or skips a listing.
 *     security: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Contained in title, author, isbn, brand or model, ignoring capitalization. Blank means no search.
 *       - in: query
 *         name: course
 *         schema: { type: array, items: { type: string } }
 *         description: Course code(s) in any accepted spelling, e.g. CHEM-201.
 *       - in: query
 *         name: category
 *         schema: { type: array, items: { $ref: '#/components/schemas/Category' } }
 *       - in: query
 *         name: condition
 *         schema: { type: array, items: { $ref: '#/components/schemas/Condition' } }
 *       - in: query
 *         name: minPrice
 *         schema: { type: integer }
 *         description: Inclusive lower bound in cents. Swapped with maxPrice when larger.
 *       - in: query
 *         name: maxPrice
 *         schema: { type: integer }
 *         description: Inclusive upper bound in cents.
 *       - in: query
 *         name: openToOffers
 *         schema: { type: string, enum: ['true'] }
 *         description: Only listings open to offers. Any other value means no filter.
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [newest, price_asc, price_desc, condition], default: newest }
 *         description: condition = best grade first.
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 24 }
 *     responses:
 *       200:
 *         description: One page of matches. A page past the end has empty items and the correct total.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ListingPage' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
router.get('/listings', async (req, res) => {
  const { where, params } = await buildFilters(req.query)
  const { sort, page, pageSize } = paging(req.query)
  const n = params.length
  // The count runs separately so a page past the end still reports the right total.
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT ${LISTING_COLUMNS} FROM listings l WHERE ${where}
       ORDER BY ${ORDER_BY[sort]} LIMIT $${n + 1} OFFSET $${n + 2}`,
      [...params, pageSize, (page - 1) * pageSize],
    ),
    pool.query(`SELECT count(*)::int AS total FROM listings l WHERE ${where}`, params),
  ])
  res.json({
    items: rows.rows.map(toListing),
    total: count.rows[0].total,
    page,
    pageSize,
  })
})

/**
 * @openapi
 * /api/listings/featured:
 *   get:
 *     tags: [Listings]
 *     summary: Featured listings for the Home page
 *     description: Up to 5 listings that are active and marked featured, newest first.
 *     security: []
 *     responses:
 *       200:
 *         description: Featured listings (possibly an empty list).
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               maxItems: 5
 *               items: { $ref: '#/components/schemas/Listing' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
router.get('/listings/featured', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT ${LISTING_COLUMNS} FROM listings l
     WHERE l.featured AND l.status = 'active'
     ORDER BY ${TIEBREAK} LIMIT 5`,
  )
  res.json(rows.map(toListing))
})

export default router
