// Owner: Wazan (@awazzan2)
// Endpoints: GET /listings/:id
//
// Everything the Listing Details page needs: the listing and its seller (requirements C2).

import { Router } from 'express'
import { pool } from '../db/pool.js'

const router = Router()

export const NOT_FOUND = 'This page was torn out.'

// Fixed words owned by other routes (Part B note). If this router is mounted first, it
// hands them on instead of reading them as listing ids.
const RESERVED_IDS = new Set(['featured', 'new', 'mine'])

// Courses and photos come back ordered by position. course_code is a domain, so it is cast
// to text to get a plain text[] that node-postgres parses into a JS array.
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

/**
 * @openapi
 * /listings/{id}:
 *   get:
 *     tags: [Listings]
 *     summary: One listing and its seller
 *     description: |
 *       Access: Optional. Owner: Wazan. A draft is visible only to its owner; everyone else
 *       gets 404, so drafts cannot be discovered. Reserved and sold listings are visible to
 *       everyone. seller.email is included only when the request carries a valid token.
 *     security: [{}, { bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string }, example: lst_001 }
 *     responses:
 *       200:
 *         description: The listing with its seller.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ListingDetail' }
 *       404:
 *         description: No such listing, or a draft the viewer does not own. "This page was torn out."
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *
 * components:
 *   schemas:
 *     ListingSeller:
 *       description: User (public) plus activeListingCount; email only for signed-in viewers.
 *       type: object
 *       required: [id, name, memberSince, yearOfStudy, usualPickupSpot, activeListingCount]
 *       properties:
 *         id: { type: string, example: usr_lina }
 *         name: { type: string, example: Lina K. }
 *         memberSince: { type: string, format: date-time }
 *         yearOfStudy: { type: integer, nullable: true, example: 3 }
 *         usualPickupSpot: { type: string, nullable: true, example: Main library entrance }
 *         activeListingCount:
 *           type: integer
 *           description: The seller's listings with status active, including this one if it is.
 *           example: 4
 *         email:
 *           type: string
 *           description: Only when the request carries a valid token.
 *           example: lina@probable.books
 *     ListingDetail:
 *       description: A Listing plus its seller (A6).
 *       allOf:
 *         - $ref: '#/components/schemas/Listing'
 *         - type: object
 *           required: [seller]
 *           properties:
 *             seller: { $ref: '#/components/schemas/ListingSeller' }
 */
router.get('/listings/:id', async (req, res, next) => {
  if (RESERVED_IDS.has(req.params.id)) return next()

  const viewerId = req.user?.id ?? null
  const { rows } = await pool.query(`${LISTING_SELECT} WHERE l.id = $1`, [req.params.id])
  const row = rows[0]
  if (!row || (row.status === 'draft' && row.seller_id !== viewerId)) {
    return res.status(404).json({ message: NOT_FOUND })
  }

  // Named columns only: the users row also holds password_hash, which never leaves here.
  const seller = await pool.query(
    `SELECT u.id, u.name, u.email, u.created_at, u.year_of_study, u.usual_pickup_spot,
            (SELECT count(*)::int FROM listings x
              WHERE x.seller_id = u.id AND x.status = 'active') AS active_listing_count
       FROM users u WHERE u.id = $1`,
    [row.seller_id],
  )
  const u = seller.rows[0]
  res.json({
    ...toListing(row),
    seller: {
      id: u.id,
      name: u.name,
      memberSince: new Date(u.created_at).toISOString(),
      yearOfStudy: u.year_of_study,
      usualPickupSpot: u.usual_pickup_spot,
      activeListingCount: u.active_listing_count,
      // Used by "Contact seller"; signed-out viewers never receive it.
      ...(viewerId ? { email: u.email } : {}),
    },
  })
})

export default router
