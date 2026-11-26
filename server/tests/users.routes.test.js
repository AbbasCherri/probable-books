import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '../src/app.js'
import { signToken } from '../src/middleware/auth.js'

describe.skipIf(!process.env.TEST_HAS_DB)('user routes (real database)', () => {
  const tag = `usr${Date.now().toString(36)}`
  let pool
  let n = 0

  beforeAll(async () => ({ pool } = await import('../src/db/pool.js')))
  afterAll(async () => {
    await pool.query(`DELETE FROM users WHERE email LIKE $1`, [`${tag}.%`])
    await pool.end()
  })

  /** A fresh account through the real register endpoint: { user, token, auth }. */
  async function account(extra = {}) {
    const res = await request(app)
      .post('/api/auth/register')
      .set('X-Forwarded-For', `10.88.0.${++n}`)
      .send({
        name: 'Test User',
        email: `${tag}.${n}@test.invalid`,
        password: 'password123',
        ...extra,
      })
    expect(res.status).toBe(201)
    return { ...res.body, auth: { Authorization: `Bearer ${res.body.token}` } }
  }

  it('GET /users/:id shows the public profile with activeListingCount, never the email', async () => {
    const res = await request(app).get('/api/users/usr_lina')
    expect(res.status).toBe(200)
    expect(Object.keys(res.body).sort()).toEqual(
      [
        'activeListingCount',
        'id',
        'memberSince',
        'name',
        'usualPickupSpot',
        'yearOfStudy',
      ].sort(),
    )
    const { rows } = await pool.query(
      `SELECT count(*)::int n FROM listings WHERE seller_id = 'usr_lina' AND status = 'active'`,
    )
    expect(res.body.activeListingCount).toBe(rows[0].n)
    expect(JSON.stringify(res.body)).not.toMatch(/@|password/)
  })

  it('GET /users/:id answers 404 for an unknown user', async () => {
    const res = await request(app).get('/api/users/usr_nobody_here')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'User not found.' })
  })

  it('PATCH /users/me changes only what is sent and never the email', async () => {
    const a = await account({ yearOfStudy: 1 })
    const res = await request(app)
      .patch('/api/users/me')
      .set(a.auth)
      .send({
        usualPickupSpot: 'Engineering quad',
        email: 'hijack@test.invalid',
        id: 'usr_x',
      })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      id: a.user.id,
      name: 'Test User',
      email: a.user.email,
      yearOfStudy: 1,
      usualPickupSpot: 'Engineering quad',
    })
    const cleared = await request(app)
      .patch('/api/users/me')
      .set(a.auth)
      .send({ yearOfStudy: null, usualPickupSpot: null, name: ' Renamed ' })
    expect(cleared.body).toMatchObject({
      name: 'Renamed',
      yearOfStudy: null,
      usualPickupSpot: null,
    })
  })

  it('PATCH /users/me rejects bad values with field messages', async () => {
    const a = await account()
    const res = await request(app)
      .patch('/api/users/me')
      .set(a.auth)
      .send({ name: '', yearOfStudy: 0, usualPickupSpot: 'The moon' })
    expect(res.status).toBe(422)
    expect(res.body.fields).toEqual({
      name: 'Add your name.',
      yearOfStudy: 'Choose a year of study from 1 to 8, or leave it empty.',
      usualPickupSpot: "Choose where you'll meet buyers.",
    })
  })

  it('changes the password only with the right current password', async () => {
    const a = await account()
    const patch = (body) => request(app).patch('/api/users/me').set(a.auth).send(body)

    const wrong = await patch({
      currentPassword: 'not-it-at-all',
      newPassword: 'brand new pw',
    })
    expect(wrong.status).toBe(422)
    expect(wrong.body.fields).toEqual({
      currentPassword: "That isn't your current password.",
    })

    const short = await patch({ currentPassword: 'password123', newPassword: 'short' })
    expect(short.body.fields).toEqual({ newPassword: 'Use at least 8 characters.' })

    const alone = await patch({ newPassword: 'brand new pw' })
    expect(alone.body.fields).toEqual({ currentPassword: 'Enter your current password.' })

    const ok = await patch({
      currentPassword: 'password123',
      newPassword: 'brand new pw',
    })
    expect(ok.status).toBe(200)
    expect(JSON.stringify(ok.body)).not.toMatch(/password|brand new/)

    const login = (password) =>
      request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', `10.88.1.${++n}`)
        .send({ email: a.user.email, password })
    expect((await login('brand new pw')).status).toBe(200)
    expect((await login('password123')).status).toBe(401)
    // The token from before the change keeps working until it expires.
    expect((await request(app).get('/api/auth/me').set(a.auth)).status).toBe(200)
  })

  it('PATCH and DELETE need sign-in', async () => {
    expect((await request(app).patch('/api/users/me').send({ name: 'x' })).status).toBe(
      401,
    )
    expect((await request(app).delete('/api/users/me')).status).toBe(401)
  })

  it('DELETE /users/me removes the account, its listings and every related offer', async () => {
    const seller = await account()
    const buyer = await account()
    const { rows } = await pool.query(
      `INSERT INTO listings (seller_id, title, category, condition, price_cents, pickup_spot)
       VALUES ($1, 'Doomed test listing', 'other', 'good', 1000, 'Bookstore steps') RETURNING id`,
      [seller.user.id],
    )
    const listingId = rows[0].id
    await pool.query(
      `INSERT INTO offers (listing_id, buyer_id, amount_cents) VALUES ($1, $2, 500)`,
      [listingId, buyer.user.id],
    )
    // The seller also made an offer on someone else's listing.
    await pool.query(
      `INSERT INTO offers (listing_id, buyer_id, amount_cents, status)
       VALUES ('lst_001', $1, 100, 'withdrawn')`,
      [seller.user.id],
    )

    const res = await request(app).delete('/api/users/me').set(seller.auth)
    expect(res.status).toBe(204)
    expect(res.text).toBe('')

    const left = await pool.query(
      `SELECT (SELECT count(*)::int FROM users WHERE id = $1) u,
              (SELECT count(*)::int FROM listings WHERE id = $2) l,
              (SELECT count(*)::int FROM offers WHERE listing_id = $2 OR buyer_id = $1) o`,
      [seller.user.id, listingId],
    )
    expect(left.rows[0]).toEqual({ u: 0, l: 0, o: 0 })
    expect((await request(app).get('/api/auth/me').set(seller.auth)).status).toBe(401)
    // A forged token for the deleted id is refused too.
    const forged = { Authorization: `Bearer ${signToken(seller.user.id)}` }
    expect((await request(app).get('/api/auth/me').set(forged)).status).toBe(401)
  })
})
