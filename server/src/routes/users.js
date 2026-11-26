// Owner: Ayk (@Ayk-12)
// Endpoints: GET /users/:id, PATCH /users/me, DELETE /users/me

import { Router } from 'express'
import { pool } from '../db/pool.js'
import { HttpError, validationError } from '../lib/errors.js'
import { checkPassword, hashPassword, MIN_PASSWORD } from '../lib/passwords.js'
import { toPublicUser, toSelfUser, USER_COLUMNS } from '../lib/users.js'
import { requireAuth } from '../middleware/auth.js'
import { PICKUP_SPOTS } from './listings.validate.js'

const router = Router()

export const USER_MESSAGES = {
  notFound: 'User not found.',
  name: 'Add your name.',
  yearOfStudy: 'Choose a year of study from 1 to 8, or leave it empty.',
  pickupSpot: "Choose where you'll meet buyers.",
  currentPassword: 'Enter your current password.',
  wrongPassword: "That isn't your current password.",
  newPassword: 'Choose a password.',
  newPasswordShort: `Use at least ${MIN_PASSWORD} characters.`,
}

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Public profile of any user
 *     description: Never includes the email address or any password information.
 *     security: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string }, example: usr_lina }
 *     responses:
 *       200:
 *         description: The profile with the number of active listings.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UserProfile' }
 *       404:
 *         description: No such user.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { message: User not found. }
 */
router.get('/users/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${USER_COLUMNS},
       (SELECT count(*)::int FROM listings l WHERE l.seller_id = u.id AND l.status = 'active')
         AS active_listing_count
     FROM users u WHERE u.id = $1`,
    [req.params.id],
  )
  if (!rows[0]) throw new HttpError(404, USER_MESSAGES.notFound)
  res.json({ ...toPublicUser(rows[0]), activeListingCount: rows[0].active_listing_count })
})

/**
 * Checks a PATCH body. Only the properties sent are changed; the email can never change.
 * Returns { sets: [[column, value]], fields } where fields holds any problems.
 */
async function readProfileChanges(body, userId) {
  const sets = []
  const fields = {}
  const has = (k) => Object.hasOwn(body, k)

  if (has('name')) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) fields.name = USER_MESSAGES.name
    else sets.push(['name', name])
  }
  if (has('yearOfStudy')) {
    const y = body.yearOfStudy
    if (y === null || (Number.isInteger(y) && y >= 1 && y <= 8))
      sets.push(['year_of_study', y])
    else fields.yearOfStudy = USER_MESSAGES.yearOfStudy
  }
  if (has('usualPickupSpot')) {
    const spot = body.usualPickupSpot
    if (spot === null || PICKUP_SPOTS.includes(spot))
      sets.push(['usual_pickup_spot', spot])
    else fields.usualPickupSpot = USER_MESSAGES.pickupSpot
  }

  // Changing the password needs both the current and the new one.
  if (has('currentPassword') || has('newPassword')) {
    const { currentPassword, newPassword } = body
    if (typeof newPassword !== 'string' || newPassword === '')
      fields.newPassword = USER_MESSAGES.newPassword
    else if (newPassword.length < MIN_PASSWORD)
      fields.newPassword = USER_MESSAGES.newPasswordShort
    if (typeof currentPassword !== 'string' || currentPassword === '') {
      fields.currentPassword = USER_MESSAGES.currentPassword
    } else {
      const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [
        userId,
      ])
      if (!(await checkPassword(currentPassword, rows[0]?.password_hash)))
        fields.currentPassword = USER_MESSAGES.wrongPassword
    }
    if (!fields.newPassword && !fields.currentPassword)
      sets.push(['password_hash', await hashPassword(newPassword)])
  }
  return { sets, fields }
}

/**
 * @openapi
 * /api/users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update your profile or password
 *     description: |
 *       Send only what changes. The email cannot be changed. Changing the password needs both
 *       currentPassword and newPassword; the existing token keeps working until it expires.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               yearOfStudy: { type: integer, minimum: 1, maximum: 8, nullable: true }
 *               usualPickupSpot: { allOf: [{ $ref: '#/components/schemas/PickupSpot' }], nullable: true }
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: The updated user.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UserSelf' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       422: { $ref: '#/components/responses/Unprocessable' }
 *   delete:
 *     tags: [Users]
 *     summary: Delete your account
 *     description: |
 *       Removes the account, its listings, the offers it made and the offers on its listings.
 *       The token stops working (GET /api/auth/me then answers 401).
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Deleted. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.patch('/users/me', requireAuth, async (req, res) => {
  const { sets, fields } = await readProfileChanges(req.body ?? {}, req.user.id)
  if (Object.keys(fields).length) throw validationError(fields)

  let row
  if (sets.length) {
    // Column names come from the fixed list above, never from the request.
    const assignments = sets.map(([col], i) => `${col} = $${i + 2}`).join(', ')
    const { rows } = await pool.query(
      `UPDATE users AS u SET ${assignments} WHERE u.id = $1 RETURNING ${USER_COLUMNS}`,
      [req.user.id, ...sets.map(([, value]) => value)],
    )
    row = rows[0]
  } else {
    const { rows } = await pool.query(
      `SELECT ${USER_COLUMNS} FROM users u WHERE u.id = $1`,
      [req.user.id],
    )
    row = rows[0]
  }
  res.json(toSelfUser(row))
})

// Listings, their offers and the offers this user made all cascade in the database (A7).
router.delete('/users/me', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM users WHERE id = $1', [req.user.id])
  res.status(204).end()
})

export default router
