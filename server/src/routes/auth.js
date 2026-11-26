// Owner: Ayk (@Ayk-12)
// Endpoints: POST /auth/register, POST /auth/login, POST /auth/logout, GET /auth/me

import { Router } from 'express'
import { pool } from '../db/pool.js'
import { HttpError, validationError } from '../lib/errors.js'
import { checkPassword, hashPassword, MIN_PASSWORD } from '../lib/passwords.js'
import { toSelfUser, USER_COLUMNS } from '../lib/users.js'
import { requireAuth, signToken } from '../middleware/auth.js'
import { attemptLimiter } from '../middleware/rateLimit.js'

const router = Router()

export const AUTH_MESSAGES = {
  name: 'Add your name.',
  email: 'Enter an email like you@school.edu.',
  emailTaken: 'That email already has a card. Sign in instead.',
  password: 'Choose a password.',
  passwordShort: `Use at least ${MIN_PASSWORD} characters.`,
  yearOfStudy: 'Choose a year of study from 1 to 8, or leave it empty.',
  badLogin: "That email and password don't match.",
}

// Emails are trimmed and compared ignoring capitalisation (A7); stored lower-case.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const cleanEmail = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '')

// Ten failed logins per client per 15 minutes are allowed; the eleventh is blocked.
// Successful logins do not count. Registering counts every attempt.
const loginLimit = attemptLimiter({ limit: 10, skipSuccessfulRequests: true })
const registerLimit = attemptLimiter({ limit: 10 })

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Create an account and sign in
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: Demo Student }
 *               email: { type: string, example: you@school.edu }
 *               password: { type: string, minLength: 8, example: password123 }
 *               yearOfStudy: { type: integer, minimum: 1, maximum: 8, nullable: true }
 *     responses:
 *       201:
 *         description: Signed in. Every problem is reported at once on failure.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/UserSelf' }
 *                 token: { type: string }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       422: { $ref: '#/components/responses/Unprocessable' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post('/auth/register', registerLimit, async (req, res) => {
  const body = req.body ?? {}
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = cleanEmail(body.email)
  const { password } = body
  const year = body.yearOfStudy ?? null

  const fields = {}
  if (!name) fields.name = AUTH_MESSAGES.name
  if (!EMAIL_RE.test(email)) fields.email = AUTH_MESSAGES.email
  if (typeof password !== 'string' || password === '')
    fields.password = AUTH_MESSAGES.password
  else if (password.length < MIN_PASSWORD) fields.password = AUTH_MESSAGES.passwordShort
  if (year !== null && !(Number.isInteger(year) && year >= 1 && year <= 8))
    fields.yearOfStudy = AUTH_MESSAGES.yearOfStudy
  if (!fields.email) {
    const taken = await pool.query('SELECT 1 FROM users WHERE lower(email) = $1', [email])
    if (taken.rowCount) fields.email = AUTH_MESSAGES.emailTaken
  }
  if (Object.keys(fields).length) throw validationError(fields)

  let row
  try {
    const { rows } = await pool.query(
      `INSERT INTO users AS u (name, email, password_hash, year_of_study)
       VALUES ($1, $2, $3, $4) RETURNING ${USER_COLUMNS}`,
      [name, email, await hashPassword(password), year],
    )
    row = rows[0]
  } catch (err) {
    // Two registrations with the same email at the same moment: the unique index decides.
    if (err.code === '23505') throw validationError({ email: AUTH_MESSAGES.emailTaken })
    throw err
  }
  res.status(201).json({ user: toSelfUser(row), token: signToken(row.id) })
})

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in with email and password
 *     description: An unknown email and a wrong password get the same answer in the same time.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: demo@probable.books }
 *               password: { type: string, example: password123 }
 *     responses:
 *       200:
 *         description: Signed in.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/UserSelf' }
 *                 token: { type: string }
 *       401:
 *         description: Unknown email or wrong password.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { message: "That email and password don't match." }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post('/auth/login', loginLimit, async (req, res) => {
  const email = cleanEmail(req.body?.email)
  const { rows } = email
    ? await pool.query(
        `SELECT ${USER_COLUMNS}, u.password_hash FROM users u WHERE lower(u.email) = $1`,
        [email],
      )
    : { rows: [] }
  const row = rows[0]
  // Always runs bcrypt, even for an unknown email, so timing gives nothing away.
  const ok = await checkPassword(req.body?.password, row?.password_hash)
  if (!ok) throw new HttpError(401, AUTH_MESSAGES.badLogin)
  res.json({ user: toSelfUser(row), token: signToken(row.id) })
})

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Who is signed in
 *     description: Used at app start to restore a session.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: The signed-in user.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UserSelf' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/auth/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${USER_COLUMNS} FROM users u WHERE u.id = $1`,
    [req.user.id],
  )
  if (!rows[0]) throw new HttpError(401, 'Sign in to continue.')
  res.json(toSelfUser(rows[0]))
})

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Sign out
 *     description: Always succeeds, even with a bad or missing token. The app discards its token.
 *     security: []
 *     responses:
 *       204: { description: Signed out. }
 */
// Tokens are stateless JWTs, so there is nothing to revoke on the server.
router.post('/auth/logout', (_req, res) => {
  res.status(204).end()
})

export default router
