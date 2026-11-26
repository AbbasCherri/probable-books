// Tests for the sign-in check (owner: Ayk). No database needed: user lookups are faked.
import express from 'express'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createAuth, signToken, verifyToken } from '../src/middleware/auth.js'

const SECRET = 'test-secret-for-the-sign-in-check'
const users = new Set(['usr_alice'])

function makeApp(userExists = async (id) => users.has(id)) {
  const { requireAuth, optionalAuth } = createAuth(userExists)
  const app = express()
  app.get('/required', requireAuth, (req, res) => res.json({ id: req.user.id }))
  app.get('/optional', optionalAuth, (req, res) => res.json({ id: req.user?.id ?? null }))
  return app
}

beforeAll(() => {
  process.env.JWT_SECRET = SECRET
  process.env.JWT_EXPIRES_IN = '7d'
})

const bearer = (token) => ['Authorization', `Bearer ${token}`]
const SIGN_IN = { message: 'Sign in to continue.' }

describe('requireAuth', () => {
  it('lets a valid token through and sets req.user to { id }', async () => {
    const res = await request(makeApp())
      .get('/required')
      .set(...bearer(signToken('usr_alice')))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: 'usr_alice' })
  })

  it('answers 401 in the A4 format when there is no token', async () => {
    const res = await request(makeApp()).get('/required')
    expect(res.status).toBe(401)
    expect(res.body).toEqual(SIGN_IN)
  })

  it('answers 401 for a header that is not a bearer token', async () => {
    const app = makeApp()
    for (const value of ['Basic abc', 'Bearer', 'Bearer a b', signToken('usr_alice')]) {
      const res = await request(app).get('/required').set('Authorization', value)
      expect(res.status, value).toBe(401)
      expect(res.body).toEqual(SIGN_IN)
    }
  })

  it('answers 401 for a damaged token', async () => {
    const res = await request(makeApp())
      .get('/required')
      .set(...bearer('not.a.token'))
    expect(res.status).toBe(401)
    expect(res.body).toEqual(SIGN_IN)
  })

  it('answers 401 for a tampered token', async () => {
    const [h, p, s] = signToken('usr_alice').split('.')
    const forged = Buffer.from(
      JSON.stringify({ sub: 'usr_bob', exp: 9999999999 }),
    ).toString('base64url')
    for (const token of [`${h}.${forged}.${s}`, `${h}.${p}.${s.slice(0, -2)}xx`]) {
      const res = await request(makeApp())
        .get('/required')
        .set(...bearer(token))
      expect(res.status).toBe(401)
    }
  })

  it('answers 401 for a token signed with another secret', async () => {
    const token = jwt.sign({}, 'some-other-secret', {
      subject: 'usr_alice',
      expiresIn: '7d',
    })
    const res = await request(makeApp())
      .get('/required')
      .set(...bearer(token))
    expect(res.status).toBe(401)
  })

  it('answers 401 for an unsigned (alg: none) token', async () => {
    const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
    const token = `${enc({ alg: 'none', typ: 'JWT' })}.${enc({ sub: 'usr_alice' })}.`
    const res = await request(makeApp())
      .get('/required')
      .set(...bearer(token))
    expect(res.status).toBe(401)
  })

  it('answers 401 for an expired token', async () => {
    const token = jwt.sign({}, SECRET, { subject: 'usr_alice', expiresIn: -10 })
    const res = await request(makeApp())
      .get('/required')
      .set(...bearer(token))
    expect(res.status).toBe(401)
    expect(res.body).toEqual(SIGN_IN)
  })

  it('answers 401 for a token without a subject', async () => {
    const token = jwt.sign({}, SECRET, { expiresIn: '7d' })
    const res = await request(makeApp())
      .get('/required')
      .set(...bearer(token))
    expect(res.status).toBe(401)
  })

  it('answers 401 once the account is deleted', async () => {
    const token = signToken('usr_gone')
    const res = await request(makeApp())
      .get('/required')
      .set(...bearer(token))
    expect(res.status).toBe(401)
    expect(res.body).toEqual(SIGN_IN)
  })

  it('accepts the scheme in any capitalisation', async () => {
    const res = await request(makeApp())
      .get('/required')
      .set('Authorization', `bearer ${signToken('usr_alice')}`)
    expect(res.status).toBe(200)
  })

  it('answers 500 in the A4 format, with no detail, when the check itself fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = makeApp(async () => {
      throw new Error('connection to db-host-1 refused')
    })
    const res = await request(app)
      .get('/required')
      .set(...bearer(signToken('usr_alice')))
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Something went wrong. Try again.' })
    expect(JSON.stringify(res.body)).not.toContain('db-host-1')
    spy.mockRestore()
  })
})

describe('optionalAuth', () => {
  it('sets req.user for a valid token', async () => {
    const res = await request(makeApp())
      .get('/optional')
      .set(...bearer(signToken('usr_alice')))
    expect(res.body).toEqual({ id: 'usr_alice' })
  })

  it('treats no token as signed out', async () => {
    const res = await request(makeApp()).get('/optional')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: null })
  })

  it('treats a bad, expired or deleted-account token as signed out, not an error', async () => {
    const expired = jwt.sign({}, SECRET, { subject: 'usr_alice', expiresIn: -10 })
    for (const token of ['not.a.token', expired, signToken('usr_gone')]) {
      const res = await request(makeApp())
        .get('/optional')
        .set(...bearer(token))
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ id: null })
    }
  })
})

describe('signToken and verifyToken', () => {
  it('round-trips the user id and holds nothing else sensitive', () => {
    const token = signToken('usr_alice')
    expect(verifyToken(token)).toBe('usr_alice')
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sub'])
  })

  it('lasts 7 days by default', () => {
    delete process.env.JWT_EXPIRES_IN
    const { iat, exp } = jwt.decode(signToken('usr_alice'))
    expect(exp - iat).toBe(7 * 24 * 60 * 60)
    process.env.JWT_EXPIRES_IN = '7d'
  })

  it('refuses to run without JWT_SECRET instead of signing with an empty key', () => {
    const saved = process.env.JWT_SECRET
    delete process.env.JWT_SECRET
    expect(() => signToken('usr_alice')).toThrow(/JWT_SECRET/)
    process.env.JWT_SECRET = saved
  })
})
