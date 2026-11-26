// Owner: Youssef (@yousefelezzi)
// Endpoints: PATCH /offers/:id
//
// One endpoint, four actions (accept, decline, counter, withdraw). Who may do what, and in
// which offer state, follows the "Offer actions: who can do what" table in requirements C3.

import { Router } from 'express'
import { withTransaction } from '../db/pool.js'
import { signedIn } from './listings.write.js'

const router = Router()

export const OFFER_MESSAGES = {
  notFound: 'Offer not found.',
  notYours: 'That offer is not yours.',
  sellerOnlyCounter: 'Only the seller can counter.',
  sellerOnlyDecide: 'Only the seller can accept or decline a pending offer.',
  buyerOnlyWithdraw: 'Only the buyer can withdraw an offer.',
  unknownAction: 'Unknown action.',
  notOpen: 'This offer is no longer open.',
  reserved: 'This listing is reserved for another buyer.',
  sold: 'This listing is sold.',
  draft: 'This listing is not posted yet.',
  counter: 'Counter with an amount between their offer and your asking price.',
}
const ACTIONS = ['accept', 'decline', 'counter', 'withdraw']

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
 * Which offer states each party may act on, and the resulting status.
 *   seller + pending:   accept, decline, counter
 *   buyer  + pending:   withdraw
 *   buyer  + countered: accept (at the counter price), decline, withdraw
 * Every other combination of a participant and a closed (or, for the seller, countered)
 * offer is "no longer open".
 */
const ALLOWED = {
  seller: { pending: { accept: 'accepted', decline: 'declined', counter: 'countered' } },
  buyer: {
    pending: { withdraw: 'withdrawn' },
    countered: { accept: 'accepted', decline: 'declined', withdraw: 'withdrawn' },
  },
}

/** The 403 role rules, checked before the offer's state (order of the failure table). */
function roleError(role, action, offerStatus) {
  if (role === 'buyer' && action === 'counter') return OFFER_MESSAGES.sellerOnlyCounter
  if (
    role === 'buyer' &&
    offerStatus === 'pending' &&
    (action === 'accept' || action === 'decline')
  ) {
    return OFFER_MESSAGES.sellerOnlyDecide
  }
  if (role === 'seller' && action === 'withdraw') return OFFER_MESSAGES.buyerOnlyWithdraw
  return null
}

/**
 * @openapi
 * /offers/{id}:
 *   patch:
 *     tags: [Offers]
 *     summary: Seller or buyer responds to an offer (accept, decline, counter, withdraw)
 *     description: |
 *       Seller on a pending offer: accept (reserves the listing in the same transaction),
 *       decline, or counter with counterCents strictly between the offer and the asking
 *       price. Buyer: withdraw a pending or countered offer; accept or decline a counter.
 *       Accepting never changes other offers. Two simultaneous accepts on one listing:
 *       exactly one succeeds, the other gets "This listing is reserved for another buyer."
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [accept, decline, counter, withdraw] }
 *               counterCents: { type: integer, description: Only for counter }
 *     responses:
 *       200:
 *         description: The updated Offer
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Offer' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403:
 *         description: |
 *           That offer is not yours. / Only the seller can counter. / Only the seller can
 *           accept or decline a pending offer. / Only the buyer can withdraw an offer.
 *       404: { description: Offer not found. }
 *       422:
 *         description: |
 *           Unknown action. / This offer is no longer open. / (accept on a listing that is
 *           not active) This listing is reserved for another buyer. | This listing is sold. |
 *           This listing is not posted yet. / fields.counterCents: Counter with an amount
 *           between their offer and your asking price.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.patch('/offers/:id', signedIn, async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const { action, counterCents } = body

  const fail = (status, message, fields) => ({
    status,
    body: fields ? { message, fields } : { message },
  })

  const outcome = await withTransaction(async (db) => {
    // Find the offer's listing, then lock the listing before the offer. Every writer that
    // touches both (accept here, listing edits) locks the listing first, so two accepts on
    // the same listing queue up: the second sees "reserved" instead of double-booking it.
    const found = await db.query('SELECT listing_id FROM offers WHERE id = $1', [
      req.params.id,
    ])
    if (!found.rows[0]) return fail(404, OFFER_MESSAGES.notFound)

    const listing = (
      await db.query(
        'SELECT id, seller_id, status, price_cents FROM listings WHERE id = $1 FOR UPDATE',
        [found.rows[0].listing_id],
      )
    ).rows[0]
    const offer = (
      await db.query('SELECT * FROM offers WHERE id = $1 FOR UPDATE', [req.params.id])
    ).rows[0]
    // Deleted between the two reads (listing deletion cascades to its offers).
    if (!offer || !listing) return fail(404, OFFER_MESSAGES.notFound)

    const me = req.user.id
    const role =
      listing.seller_id === me ? 'seller' : offer.buyer_id === me ? 'buyer' : null
    if (!role) return fail(403, OFFER_MESSAGES.notYours)

    const known = ACTIONS.includes(action)
    if (known) {
      const forbidden = roleError(role, action, offer.status)
      if (forbidden) return fail(403, forbidden)
    } else {
      return fail(422, OFFER_MESSAGES.unknownAction)
    }

    const next = ALLOWED[role][offer.status]?.[action]
    if (!next) return fail(422, OFFER_MESSAGES.notOpen)

    if (action === 'accept' && listing.status !== 'active') {
      return fail(422, OFFER_MESSAGES[listing.status])
    }

    if (action === 'counter') {
      const ok =
        Number.isInteger(counterCents) &&
        counterCents > offer.amount_cents &&
        counterCents < listing.price_cents
      if (!ok) {
        return fail(422, OFFER_MESSAGES.counter, { counterCents: OFFER_MESSAGES.counter })
      }
    }

    const updated = await db.query(
      `UPDATE offers
         SET status = $2, counter_cents = CASE WHEN $3::int IS NULL THEN counter_cents ELSE $3 END
       WHERE id = $1 RETURNING *`,
      [offer.id, next, action === 'counter' ? counterCents : null],
    )
    // All or nothing: the offer and the listing change in the same transaction.
    if (action === 'accept') {
      await db.query(`UPDATE listings SET status = 'reserved' WHERE id = $1`, [
        listing.id,
      ])
    }
    return { status: 200, body: toOffer(updated.rows[0]) }
  })

  res.status(outcome.status).json(outcome.body)
})

export default router
