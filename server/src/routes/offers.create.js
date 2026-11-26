// Owner: Wazan (@awazzan2)
// Endpoints: POST /listings/:id/offers, GET /offers
//
// A buyer makes an offer (requirements C2), and either party lists their offers for the
// Dashboard tabs. Seller responses (accept, decline, counter, withdraw) live in
// offers.respond.js.

import { Router } from 'express'
import { pool, withTransaction } from '../db/pool.js'

const router = Router()

export const MESSAGES = {
  signIn: 'Sign in to continue.',
  notFound: 'This page was torn out.',
  ownListing: 'You cannot make an offer on your own listing.',
  reserved: 'This listing is reserved for another buyer.',
  sold: 'This listing is sold.',
  draft: 'This listing is not posted yet.',
  noOffers: "This seller isn't taking offers. Buy at the asking price.",
  alreadyPending:
    'You already have an offer waiting on this listing. Withdraw it to make a new one.',
  amount: 'Enter an amount above $0 and at most the asking price.',
  messageLength: 'Keep the message under 280 characters.',
  messageType: 'Write the message as text.',
  direction: 'Use received or sent.',
}

const MESSAGE_MAX = 280
const NOT_ACTIVE = {
  reserved: MESSAGES.reserved,
  sold: MESSAGES.sold,
  draft: MESSAGES.draft,
}
// Partial unique index from migration 001: one pending offer per buyer per listing.
const ONE_PENDING_INDEX = 'offers_one_pending_per_buyer'

/** 422 that names the field at fault (A4). */
class FieldError extends Error {
  constructor(field, message) {
    super(message)
    this.field = field
  }
}
/** 422 business-rule failure with no field (A4). */
class RuleError extends Error {}
class NotFound extends Error {}

/** Required access (A3). Ayk's middleware sets req.user = { id } for a valid token. */
function signedIn(req, res, next) {
  if (!req.user?.id) return res.status(401).json({ message: MESSAGES.signIn })
  next()
}

/** Database row -> Offer (A6). */
export function toOffer(row) {
  return {
    id: row.id,
    listingId: row.listing_id,
    buyerId: row.buyer_id,
    amountCents: row.amount_cents,
    message: row.message,
    status: row.status,
    counterCents: row.counter_cents,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

/**
 * The body checks, kept separate from the listing checks because the C2 table puts them
 * last. Returns the cleaned values or throws a FieldError.
 */
function readOfferBody(body, askingCents) {
  const { amountCents, message } = body ?? {}
  if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > askingCents) {
    throw new FieldError('amountCents', MESSAGES.amount)
  }
  if (message !== undefined && message !== null && typeof message !== 'string') {
    throw new FieldError('message', MESSAGES.messageType)
  }
  const text = (message ?? '').trim()
  if (text.length > MESSAGE_MAX) throw new FieldError('message', MESSAGES.messageLength)
  return { amountCents, message: text }
}

/**
 * @openapi
 * /listings/{id}/offers:
 *   post:
 *     tags: [Offers]
 *     summary: Make an offer on a listing
 *     description: |
 *       Access: Required. Owner: Wazan. Creates a pending offer from the signed-in buyer.
 *       Checks run in the order of the failures below; the first failure is reported.
 *       A buyer has at most one pending offer per listing, even under simultaneous requests.
 *       Making an offer does not change the listing.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string }, example: lst_001 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amountCents]
 *             properties:
 *               amountCents:
 *                 type: integer
 *                 minimum: 1
 *                 description: Above 0 and at most the listing's asking price.
 *                 example: 4000
 *               message:
 *                 type: string
 *                 maxLength: 280
 *                 description: Optional; trimmed. Missing means empty text.
 *                 example: Can meet after 3 at the library.
 *     responses:
 *       201:
 *         description: The new offer, status pending and counterCents null.
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Offer' } } }
 *       401:
 *         description: Not signed in. "Sign in to continue."
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
 *       404:
 *         description: No such listing, or someone else's draft. "This page was torn out."
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
 *       422:
 *         description: |
 *           In this order:
 *           - Own listing: "You cannot make an offer on your own listing."
 *           - Not active: "This listing is reserved for another buyer." /
 *             "This listing is sold." / "This listing is not posted yet."
 *           - Not open to offers: "This seller isn't taking offers. Buy at the asking price."
 *           - Already pending: "You already have an offer waiting on this listing. Withdraw
 *             it to make a new one."
 *           - fields.amountCents: "Enter an amount above $0 and at most the asking price."
 *           - fields.message: "Keep the message under 280 characters."
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
 */
router.post('/listings/:id/offers', signedIn, async (req, res) => {
  const buyerId = req.user.id
  try {
    const offer = await withTransaction(async (db) => {
      // FOR SHARE: an accept on this listing (which UPDATEs it) waits until this offer is in,
      // so we never add a pending offer to a listing that just became reserved.
      const { rows } = await db.query(
        `SELECT id, seller_id, status, price_cents, open_to_offers
           FROM listings WHERE id = $1 FOR SHARE`,
        [req.params.id],
      )
      const listing = rows[0]
      const isSeller = listing?.seller_id === buyerId
      if (!listing || (listing.status === 'draft' && !isSeller)) throw new NotFound()
      if (isSeller) throw new RuleError(MESSAGES.ownListing)
      if (listing.status !== 'active') throw new RuleError(NOT_ACTIVE[listing.status])
      if (!listing.open_to_offers) throw new RuleError(MESSAGES.noOffers)

      const pending = await db.query(
        `SELECT 1 FROM offers WHERE listing_id = $1 AND buyer_id = $2 AND status = 'pending'`,
        [listing.id, buyerId],
      )
      if (pending.rowCount) throw new RuleError(MESSAGES.alreadyPending)

      const values = readOfferBody(req.body, listing.price_cents)
      const inserted = await db.query(
        `INSERT INTO offers (listing_id, buyer_id, amount_cents, message)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [listing.id, buyerId, values.amountCents, values.message],
      )
      return toOffer(inserted.rows[0])
    })
    res.status(201).json(offer)
  } catch (err) {
    if (err instanceof NotFound)
      return res.status(404).json({ message: MESSAGES.notFound })
    if (err instanceof RuleError) return res.status(422).json({ message: err.message })
    if (err instanceof FieldError) {
      return res
        .status(422)
        .json({ message: err.message, fields: { [err.field]: err.message } })
    }
    // Two identical offers at the same moment: both pass the check above, the unique index
    // lets only one INSERT through, and the other lands here.
    if (err.code === '23505' && err.constraint === ONE_PENDING_INDEX) {
      return res.status(422).json({ message: MESSAGES.alreadyPending })
    }
    throw err
  }
})

/**
 * @openapi
 * /offers:
 *   get:
 *     tags: [Offers]
 *     summary: List the signed-in user's offers
 *     description: |
 *       Access: Required. Owner: Wazan. Powers the Dashboard tabs. Only the caller's own
 *       offers, in every status, newest first. `listing` is null when the buyer may no longer
 *       see it (the seller moved it back to draft).
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: direction
 *         schema: { type: string, enum: [received, sent], default: received }
 *         description: received = offers on listings I sell; sent = offers I made.
 *     responses:
 *       200:
 *         description: Offers with context, newest first. Empty list when there are none.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/OfferWithContext' }
 *       401:
 *         description: Not signed in. "Sign in to continue."
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
 *       422:
 *         description: direction is anything else. fields.direction "Use received or sent."
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
 *
 * components:
 *   schemas:
 *     OfferWithContext:
 *       description: An Offer plus the listing, buyer and seller it belongs to (A6).
 *       allOf:
 *         - $ref: '#/components/schemas/Offer'
 *         - type: object
 *           required: [listing, buyer, seller]
 *           properties:
 *             listing:
 *               type: object
 *               nullable: true
 *               required: [id, title, priceCents, courseCodes, status, sellerName]
 *               properties:
 *                 id: { type: string, example: lst_001 }
 *                 title: { type: string, example: 'Organic Chemistry, 4th edition' }
 *                 priceCents: { type: integer, example: 4500 }
 *                 courseCodes:
 *                   type: array
 *                   items: { type: string, example: CHEM 201 }
 *                 status: { type: string, enum: [draft, active, reserved, sold] }
 *                 sellerName: { type: string, example: Lina K. }
 *             buyer:
 *               type: object
 *               required: [id, name]
 *               properties:
 *                 id: { type: string, example: usr_jad }
 *                 name: { type: string, example: Jad M. }
 *             seller:
 *               type: object
 *               required: [id, name]
 *               properties:
 *                 id: { type: string, example: usr_lina }
 *                 name: { type: string, example: Lina K. }
 */
router.get('/offers', signedIn, async (req, res) => {
  const direction = req.query.direction ?? 'received'
  if (direction !== 'received' && direction !== 'sent') {
    return res
      .status(422)
      .json({ message: MESSAGES.direction, fields: { direction: MESSAGES.direction } })
  }
  const mine = direction === 'received' ? 'l.seller_id = $1' : 'o.buyer_id = $1'
  const { rows } = await pool.query(
    `SELECT o.*, l.title, l.price_cents, l.status AS listing_status,
            l.seller_id, s.name AS seller_name, b.name AS buyer_name,
            COALESCE((SELECT array_agg(lc.course_code::text ORDER BY lc.position)
                        FROM listing_courses lc WHERE lc.listing_id = l.id), '{}')
              AS course_codes
       FROM offers o
       JOIN listings l ON l.id = o.listing_id
       JOIN users s ON s.id = l.seller_id
       JOIN users b ON b.id = o.buyer_id
      WHERE ${mine}
      ORDER BY o.created_at DESC, o.id DESC`,
    [req.user.id],
  )
  res.json(
    rows.map((row) => ({
      ...toOffer(row),
      // A buyer may not learn about a listing its seller has turned back into a draft.
      listing:
        direction === 'sent' && row.listing_status === 'draft'
          ? null
          : {
              id: row.listing_id,
              title: row.title,
              priceCents: row.price_cents,
              courseCodes: row.course_codes,
              status: row.listing_status,
              sellerName: row.seller_name,
            },
      buyer: { id: row.buyer_id, name: row.buyer_name },
      seller: { id: row.seller_id, name: row.seller_name },
    })),
  )
})

export default router
