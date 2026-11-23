# Note to Ayk: the sign-in check and shared API client are blocking us

From Wazan, 23 Nov 2026. Section references are to the Backend Requirements PDF (Phase 2).

Hi Ayk. This is a heads-up, not a complaint. Your two "deliver first" items from section C4 are
what the rest of the backend is waiting on. Below are what's missing, what it breaks, and a
suggested way to build each one quickly, written to fit the code that's already up for review.

## 1. What's missing

Both items were due at **Gate 2, Fri 20 Nov 12:00** (Part D). As of today, neither is on GitHub:

| Deliverable (C4)                                  | Where it should live                    | State on `main` today                              |
| ------------------------------------------------- | --------------------------------------- | -------------------------------------------------- |
| Sign-in check (`requireAuth`, `optionalAuth`)     | `server/src/middleware/auth.js`         | Placeholder only: `export {}`                      |
| Shared way for pages to call the API              | `src/services/` (frontend)              | Pages still call the mock in `src/services/api.js` |
| Your endpoints (register, login, me, logout, ...) | `server/src/routes/auth.js`, `users.js` | Empty routers                                      |

There's no branch with this work on GitHub either. If it's on your laptop, pushing it as a draft
PR today would already unblock us.

## 2. Why it blocks the team

**The real problem: no one can sign in to the API yet.** Every route that needs a signed-in user
reads `req.user.id`, and only your middleware sets `req.user`. Without it:

- **Every Required endpoint returns 401, always**, even with a correct token. That covers:
  - Wazan: `POST /api/listings/:id/offers` and `GET /api/offers` (PR #32).
  - Youssef: `POST`, `PATCH` and `DELETE /api/listings`, `GET /api/listings/mine` and
    `PATCH /api/offers/:id` (branch `feat/server-listing-writes`).
- **Optional access does nothing:** `GET /api/listings/:id` (PR #34) treats everyone as signed out.
  So the seller's email never shows for "Contact seller", and owners can't open their own drafts.
- **The Dashboard can't load:** `GET /api/offers` is the handoff Youssef needs today
  (Mon 23 Nov, Part D), and it requires sign-in.
- **The frontend can't switch to the live API on Wed 25 and Thu 26 Nov** (Part D) without the
  shared client. Each of us would have to write our own `fetch` code, which is exactly what C4
  says to avoid.

**Why our tests pass anyway (and why that hides the gap):** Youssef's tests and mine stand in for
your middleware. A test-only header, `x-test-user: usr_123`, sets `req.user = { id: 'usr_123' }`.
That proves our endpoints work once `req.user` is set, but **nothing checks real tokens until
your middleware exists.** The gap won't show in CI; it shows the first time someone tries the
live app.

## 3. The contract our code already depends on

You don't need to change anything in our routes if the middleware does exactly this (A2, A3):

1. **For a valid token, set `req.user = { id }`**, where `id` is the user's id (`usr_...`).
   Nothing more is needed on `req.user`; we look up anything else ourselves.
2. **A token is valid only if all of these hold:**
   - it arrives as `Authorization: Bearer <token>`;
   - it's a JWT signed with `JWT_SECRET` and not older than 7 days (`JWT_EXPIRES_IN=7d`);
   - the user it names **still exists**. After `DELETE /api/users/me` the token must stop
     working (C4 acceptance: "deleted-user tokens give 401").
3. **Required access:** a missing, damaged, expired or deleted-user token gives
   **401 `{ "message": "Sign in to continue." }`** (exact text, A3 and A4).
4. **Optional access:** a bad token is **not an error**. The request continues signed out, with
   `req.user` unset (A3).
5. **The token's user id is the only source of "who is acting"**, never the request body (A2).

Our route files already return the 401 themselves when `req.user` is missing (Youssef's
`signedIn` and mine), so the simplest setup is **one `optionalAuth` for all of `/api`**. See 4b.

## 4. Suggested solution, part 1: the sign-in check (do this first)

### 4a. `server/src/middleware/auth.js`

A complete version you can take as-is or adapt. It uses `jsonwebtoken`, which is already in
`server/package.json`.

```js
// Owner: Ayk (@Ayk-12)
// JWT sign-in check (requirements A2, A3). Sets req.user = { id } for a valid token.
import jwt from 'jsonwebtoken'
import { pool } from '../db/pool.js'

const SECRET = process.env.JWT_SECRET
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
if (!SECRET) throw new Error('JWT_SECRET is not set (see server/.env.example)')

export const SIGN_IN = 'Sign in to continue.'

/** Used by register and login: a token naming the user, valid for 7 days. */
export function signToken(userId) {
  return jwt.sign({}, SECRET, {
    subject: userId,
    expiresIn: EXPIRES_IN,
    algorithm: 'HS256',
  })
}

/** The user named by a valid token, or null. Never throws for a bad token. */
async function userFromRequest(req) {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ')
  if (scheme !== 'Bearer' || !token) return null
  let payload
  try {
    // Pin the algorithm so a forged "alg: none" token is rejected.
    payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] })
  } catch {
    return null // damaged, wrong signature or expired
  }
  // A token for a deleted account must stop working (C4).
  const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [payload.sub])
  return rows[0] ? { id: rows[0].id } : null
}

/** Optional access: a bad token counts as signed out, never as an error. */
export async function optionalAuth(req, _res, next) {
  const user = await userFromRequest(req)
  if (user) req.user = user
  next()
}

/** Required access: 401 in the A4 format unless the token is valid. */
export async function requireAuth(req, res, next) {
  const user = await userFromRequest(req)
  if (!user) return res.status(401).json({ message: SIGN_IN })
  req.user = user
  next()
}
```

Notes:

- Express 5 passes errors from `async` middleware to the error handler, so a database hiccup
  becomes the standard 500, not a crash.
- The user lookup is one indexed query per signed-in request, which is fine at our scale and
  the simplest way to meet the deleted-account rule.
- `requireAuth` is for your own routes (`/auth/me`, `/users/me`, `/uploads`). Our routes already
  have their own 401 guard.

### 4b. Mounting it (one line in `app.js`, so agree it with Abbas)

`app.js` belongs to Abbas, so agree this with him. It needs to come **after `express.json()`
and before every router**:

```js
app.use(express.json())
app.use('/api', optionalAuth) // sets req.user for a valid token; never rejects
// ...then health, listings, courses, offers, auth, users, uploads routers
```

With that one line:

- every Required endpoint of ours works, because our guards turn "no `req.user`" into the right 401;
- `GET /api/listings/:id` gets its Optional behavior;
- your own routes add `requireAuth` where they need it.

### 4c. How to check it

- **Same route, same app:** reuse the pattern in `server/tests/helpers/wazan.js` (or Youssef's
  `youssef.js`), but mount the real `optionalAuth` instead of the `x-test-user` stub. Then call
  a Required route with:
  - no header, giving 401;
  - `Bearer garbage`, giving 401;
  - a token signed with another secret, giving 401;
  - `jwt.sign({}, SECRET, { subject: id, expiresIn: -1 })` (already expired), giving 401;
  - a valid token for a deleted user, giving 401;
  - a valid token, giving 200.
- **Optional:** run the same cases against `GET /api/listings/:id`. Every bad token must give
  **200** (signed out, no `seller.email`), never 401.
- These are your C4 acceptance items ("tampered, expired and deleted-user tokens all give 401
  in the A4 format on every Required endpoint").

## 5. Suggested solution, part 2: the shared API client (frontend)

C4 asks for one place through which every page talks to the API. The least disruptive design
**keeps every function name in `src/services/api.js`** (`getListing`, `makeOffer`, `getOffers`,
`login`, ...). Then no page changes: only the bodies switch from the mock to `fetch`.

### 5a. What the client must do (C4)

- Read the API address from the environment: `VITE_API_URL` (for example
  `http://localhost:4000/api` locally, and the Render URL in production).
- Send the stored token as `Authorization: Bearer <token>` on every request.
- Return the A6 shapes unchanged (the server already returns camelCase).
- Turn every failure into the existing `ApiError`, carrying `status`, `message`, `fields`
  (422 form errors) and `closest` (unknown course). Pages already rely on these:
  - `LoginPage` checks `err.status === 401`;
  - `RegisterPage` reads 422 `fields`;
  - `CourseDetailsPage` reads `error.closest`.
- **If the API answers 401 while a token is stored, sign the user out** (clear the token and tell
  `AuthContext`), so an expired token sends people to Login next time (C4 page outputs).

### 5b. A sketch

```js
// src/services/http.js  (Owner: Ayk) – the one place that talks to the API
import { readJSON, removeKey } from '@/lib/storage'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'
export const TOKEN_KEY = 'pb.token'

export async function request(method, path, { body, query } = {}) {
  const url = new URL(BASE + path)
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === '') continue
    for (const item of [].concat(v)) url.searchParams.append(k, item) // repeated params
  }
  const token = readJSON(TOKEN_KEY)
  const isForm = body instanceof FormData // POST /uploads is multipart
  const res = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && token) {
      removeKey(TOKEN_KEY)
      window.dispatchEvent(new Event('pb:signed-out')) // AuthContext listens and clears the user
    }
    // ApiError stays exported from api.js, so pages keep importing it from there.
    const { ApiError } = await import('./api')
    const err = new ApiError(
      res.status,
      data?.message ?? 'Something went wrong. Try again.',
      data?.fields,
    )
    if (data?.closest) err.closest = data.closest
    throw err
  }
  return data
}
```

Then in `api.js`, each function becomes a thin call, for example:

```js
export const getListing = (id) => request('GET', `/listings/${encodeURIComponent(id)}`)
export const makeOffer = (listingId, data) =>
  request('POST', `/listings/${encodeURIComponent(listingId)}/offers`, { body: data })
export const getOffers = ({ direction = 'received' } = {}) =>
  request('GET', '/offers', { query: { direction } })

export async function login(email, password) {
  const { user, token } = await request('POST', '/auth/login', {
    body: { email, password },
  })
  writeJSON(TOKEN_KEY, token)
  return user
}
```

(In real code, put `ApiError` in its own small module that both files import, rather than the
dynamic `import()` above. The sketch only shows where it plugs in.)

Two details worth getting right:

- **Course codes in URLs:** pages use `CHEM-201`, and the API accepts that spelling (A1), so pass
  it through unchanged.
- **Mock to live, one page at a time:** keep the mock reachable while each owner switches their
  page over, for example a `VITE_USE_MOCK=true` flag that keeps today's behavior. Then nobody's
  page breaks on Wed 25 Nov before its owner has checked it.

## 6. Suggested order (fastest unblock first)

1. **Today:** `middleware/auth.js` (section 4a), plus the one-line mount agreed with Abbas (4b).
   Push it as its own small PR. This alone makes Youssef's and my Required endpoints usable.
2. **`POST /auth/register` and `/auth/login`** using `signToken` (bcrypt for passwords; never log
   or return them). We need real tokens to try anything end to end.
3. **`GET /auth/me` and `POST /auth/logout`.** The app checks the session on every page.
4. **The shared client** (section 5), before Wed 25 Nov, so each of us can switch our pages over.
5. Then `/users/:id`, `PATCH` and `DELETE /users/me`, and `/uploads` (uploads is first in line to be
   cut if time runs short, Part D).

## 7. Things already settled that you can rely on

- **Database:** the `users` table has `password_hash` (bcrypt) and a unique index on
  `lower(email)`, so "same email in different capitalization" is enforced by the database (A7).
  The seed hashes every demo password (`password123`) with `bcryptjs`.
- **Environment:** `.env.example` already has `JWT_SECRET` and `JWT_EXPIRES_IN=7d`, and the CI
  `server` job sets `JWT_SECRET`.
- **Test stub:** our test helpers use the `x-test-user` header stub. Please keep it **only in
  tests**; it must never be mounted in `app.js`.

If it helps, I'm happy to pair on the middleware or review it quickly (we're review partners in
Part E). Ping me on the PR and I'll look the same day.

Wazan
