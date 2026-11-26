import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '../src/app.js'

describe.skipIf(!process.env.TEST_HAS_DB)('GET /api/listings/featured', () => {
  let pool
  beforeAll(async () => ({ pool } = await import('../src/db/pool.js')))
  afterAll(() => pool?.end())

  it('returns up to 5 active featured listings, newest first', async () => {
    const res = await request(app).get('/api/listings/featured')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeLessThanOrEqual(5)
    for (const l of res.body) {
      expect(l.featured).toBe(true)
      expect(l.status).toBe('active')
    }
    const dates = res.body.map((l) => l.createdAt)
    expect(dates).toEqual([...dates].sort().reverse())

    const { rows } = await pool.query(
      `SELECT id FROM listings WHERE featured AND status = 'active'
       ORDER BY created_at DESC, id ASC LIMIT 5`,
    )
    expect(res.body.map((l) => l.id)).toEqual(rows.map((r) => r.id))
  })

  it('is a fixed word, not a listing id', async () => {
    const res = await request(app).get('/api/listings/featured?id=lst_001')
    expect(Array.isArray(res.body)).toBe(true)
  })
})
