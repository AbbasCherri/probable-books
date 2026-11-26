import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '../src/app.js'

describe.skipIf(!process.env.TEST_HAS_DB)('GET /api/listings/new', () => {
  const get = (qs = '') => request(app).get(`/api/listings/new${qs}`)
  let pool
  let active
  beforeAll(async () => {
    ;({ pool } = await import('../src/db/pool.js'))
    const { rows } = await pool.query(
      `SELECT id FROM listings WHERE status = 'active' ORDER BY created_at DESC, id ASC`,
    )
    active = rows.map((r) => r.id)
  })
  afterAll(() => pool?.end())

  it('defaults to the 10 newest active listings', async () => {
    const res = await get()
    expect(res.status).toBe(200)
    expect(res.body.map((l) => l.id)).toEqual(active.slice(0, 10))
    expect(res.body.every((l) => l.status === 'active')).toBe(true)
  })

  it('honours limit and clamps it to 1..50', async () => {
    expect((await get('?limit=3')).body).toHaveLength(3)
    expect((await get('?limit=0')).body).toHaveLength(1)
    expect((await get('?limit=-7')).body).toHaveLength(1)
    expect((await get('?limit=500')).body).toHaveLength(Math.min(50, active.length))
    expect((await get('?limit=lots')).body).toHaveLength(10)
  })
})
