import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '../src/app.js'

// Each test talks from its own client address (trust proxy reads X-Forwarded-For), so the
// per-client attempt limits of one test never affect another.
let ipSeq = 0
const client = () => `10.77.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`

describe.skipIf(!process.env.TEST_HAS_DB)('auth routes (real database)', () => {
  const tag = `auth${Date.now().toString(36)}`
  const email = (n) => `${tag}.${n}@test.invalid`
  let pool

  beforeAll(async () => ({ pool } = await import('../src/db/pool.js')))
  afterAll(async () => {
    await pool.query(`DELETE FROM users WHERE email LIKE $1`, [`${tag}.%`])
    await pool.end()
  })

  const register = (body, ip = client()) =>
    request(app).post('/api/auth/register').set('X-Forwarded-For', ip).send(body)
  const login = (body, ip = client()) =>
    request(app).post('/api/auth/login').set('X-Forwarded-For', ip).send(body)

  it('registers, signs in, and the token works on /auth/me', async () => {
    const res = await register({
      name: '  Ada L. ',
      email: `  ${email('ada').toUpperCase()} `,
      password: 'correct horse',
      yearOfStudy: 2,
    })
    expect(res.status).toBe(201)
    expect(Object.keys(res.body.user).sort()).toEqual(
      ['email', 'id', 'memberSince', 'name', 'usualPickupSpot', 'yearOfStudy'].sort(),
    )
    expect(res.body.user).toMatchObject({
      name: 'Ada L.',
      email: email('ada'),
      yearOfStudy: 2,
      usualPickupSpot: null,
    })
    expect(typeof res.body.token).toBe('string')
    expect(JSON.stringify(res.body)).not.toMatch(/password|correct horse|\$2[aby]\$/)

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${res.body.token}`)
    expect(me.status).toBe(200)
    expect(me.body).toEqual(res.body.user)

    const stored = await pool.query('SELECT password_hash FROM users WHERE id = $1', [
      res.body.user.id,
    ])
    expect(stored.rows[0].password_hash).toMatch(/^\$2[aby]\$10\$/)
  })

  it('reports every problem at once with the A8 messages', async () => {
    const res = await register({
      name: '  ',
      email: 'nope',
      password: 'short',
      yearOfStudy: 12,
    })
    expect(res.status).toBe(422)
    expect(res.body.fields).toEqual({
      name: 'Add your name.',
      email: 'Enter an email like you@school.edu.',
      password: 'Use at least 8 characters.',
      yearOfStudy: 'Choose a year of study from 1 to 8, or leave it empty.',
    })
    expect(res.body.message).toBe(Object.values(res.body.fields).join(' '))
    const missing = await register({})
    expect(missing.body.fields.password).toBe('Choose a password.')
  })

  it('rejects the same email again in any capitalisation, even at the same moment', async () => {
    await register({ name: 'Bo', email: email('bo'), password: 'password123' })
    const again = await register({
      name: 'Bo 2',
      email: email('bo').toUpperCase(),
      password: 'password123',
    })
    expect(again.status).toBe(422)
    expect(again.body.fields).toEqual({
      email: 'That email already has a card. Sign in instead.',
    })

    const pair = await Promise.all(
      [1, 2].map(() =>
        register({ name: 'Cy', email: email('cy'), password: 'password123' }),
      ),
    )
    expect(pair.map((r) => r.status).sort()).toEqual([201, 422])
  })

  it('logs in ignoring capitalisation and surrounding spaces', async () => {
    await register({ name: 'Di', email: email('di'), password: 'password123' })
    const res = await login({
      email: `  ${email('di').toUpperCase()}  `,
      password: 'password123',
    })
    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe(email('di'))
    expect(typeof res.body.token).toBe('string')
  })

  it('logs in the seeded demo account', async () => {
    const res = await login({ email: 'demo@probable.books', password: 'password123' })
    expect(res.status).toBe(200)
    expect(res.body.user.id).toBe('usr_demo')
  })

  it('answers a wrong password and an unknown email identically', async () => {
    await register({ name: 'Ed', email: email('ed'), password: 'password123' })
    const wrong = await login({ email: email('ed'), password: 'password124' })
    const unknown = await login({ email: email('nobody'), password: 'password123' })
    const blank = await login({})
    for (const r of [wrong, unknown, blank]) {
      expect(r.status).toBe(401)
      expect(r.body).toEqual({ message: "That email and password don't match." })
    }
  })

  it('takes about as long for an unknown email as for a wrong password', async () => {
    await register({ name: 'Fa', email: email('fa'), password: 'password123' })
    const time = async (body) => {
      const start = performance.now()
      await login(body)
      return performance.now() - start
    }
    const wrong = []
    const unknown = []
    for (let i = 0; i < 3; i++) {
      wrong.push(await time({ email: email('fa'), password: 'nope-nope' }))
      unknown.push(await time({ email: email(`ghost${i}`), password: 'nope-nope' }))
    }
    const median = (xs) => xs.sort((a, b) => a - b)[1]
    // Both paths run one bcrypt comparison; without it an unknown email would be ~10x faster.
    expect(median(unknown)).toBeGreaterThan(median(wrong) * 0.5)
  })

  it('blocks the eleventh rapid failed login from one client, not the tenth', async () => {
    const ip = client()
    const statuses = []
    for (let i = 0; i < 11; i++) {
      statuses.push((await login({ email: email('rate'), password: 'x' }, ip)).status)
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true)
    const blocked = await login({ email: email('rate'), password: 'x' }, ip)
    expect(blocked.status).toBe(429)
    expect(blocked.body).toEqual({
      message: 'Too many attempts. Wait a few minutes and try again.',
    })
    // Another client is unaffected.
    expect((await login({ email: email('rate'), password: 'x' })).status).toBe(401)
  }, 60_000)

  it('/auth/me needs a valid token; logout always succeeds', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401)
    const bad = await request(app).get('/api/auth/me').set('Authorization', 'Bearer junk')
    expect(bad.body).toEqual({ message: 'Sign in to continue.' })
    const out = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer junk')
    expect(out.status).toBe(204)
    expect(out.text).toBe('')
  })
})
