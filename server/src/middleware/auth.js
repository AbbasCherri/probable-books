// Owner: Ayk (@Ayk-12)
// Purpose: JWT authentication middleware (requireAuth, optionalAuth) shared by the route files.
//
// How the routes use it (Part A2 and A3 of the backend requirements):
//   router.get('/offers', requireAuth, handler)       Required: no valid token -> 401
//   router.get('/listings/:id', optionalAuth, handler) Optional: a bad token counts as signed out
// After either one runs, `req.user` is `{ id }` for a signed-in caller and undefined otherwise.
// Owner and Participant checks (403) are done by the route itself, using `req.user.id`.
import jwt from 'jsonwebtoken'

export const SIGN_IN_MESSAGE = 'Sign in to continue.'
const SERVER_ERROR_MESSAGE = 'Something went wrong. Try again.'

// Pinned so a token can never choose its own algorithm (the classic "alg: none" trick).
const ALGORITHM = 'HS256'

function secret() {
  const value = process.env.JWT_SECRET
  if (!value) throw new Error('JWT_SECRET is not set (see server/.env.example)')
  return value
}

/** Create the token returned by register and login. It holds only the user id. */
export function signToken(userId) {
  return jwt.sign({}, secret(), {
    algorithm: ALGORITHM,
    subject: userId,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

/**
 * Read the bearer token from the request. Returns null when the header is missing or is not
 * of the form `Authorization: Bearer <token>`.
 */
function readToken(req) {
  const match = /^Bearer\s+(\S+)$/i.exec(req.get('authorization') ?? '')
  return match ? match[1] : null
}

/**
 * Check a token's signature and expiry, and return the user id inside it.
 * Returns null for anything that is not a good token (damaged, tampered, expired, no subject).
 * Real faults, such as a missing JWT_SECRET, are thrown instead of being mistaken for a bad token.
 */
export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, secret(), { algorithms: [ALGORITHM] })
    return typeof payload.sub === 'string' && payload.sub ? payload.sub : null
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.NotBeforeError)
      return null
    // TokenExpiredError extends JsonWebTokenError, so expired tokens are covered above.
    throw err
  }
}

/** Does this user still exist? A token belonging to a deleted account must stop working. */
async function userExistsInDatabase(id) {
  // Loaded on first use so importing this file never needs a database connection.
  const { pool } = await import('../db/pool.js')
  const { rowCount } = await pool.query('SELECT 1 FROM users WHERE id = $1', [id])
  return rowCount > 0
}

/**
 * Build the two middleware functions. `userExists` is a parameter only so tests can run
 * without a database; the app uses the default export below.
 */
export function createAuth(userExists = userExistsInDatabase) {
  /** Work out who is calling. Returns the user id, or null when the caller is signed out. */
  async function identify(req) {
    const token = readToken(req)
    if (!token) return null
    const id = verifyToken(token)
    if (!id) return null
    return (await userExists(id)) ? id : null
  }

  function fail(res, err) {
    // Never include the error object in the response: no technical detail is ever exposed.
    console.error('Auth check failed:', err?.message)
    res.status(500).json({ message: SERVER_ERROR_MESSAGE })
  }

  async function requireAuth(req, res, next) {
    try {
      const id = await identify(req)
      if (!id) return res.status(401).json({ message: SIGN_IN_MESSAGE })
      req.user = { id }
      next()
    } catch (err) {
      fail(res, err)
    }
  }

  async function optionalAuth(req, res, next) {
    try {
      const id = await identify(req)
      if (id) req.user = { id }
      next()
    } catch (err) {
      fail(res, err)
    }
  }

  return { requireAuth, optionalAuth }
}

export const { requireAuth, optionalAuth } = createAuth()
