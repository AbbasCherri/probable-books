import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { app } from '../src/app.js'
import { pool } from '../src/db/pool.js'

describe('GET /api/health', () => {
  afterEach(() => vi.restoreAllMocks())

  it('answers ok when the database answers', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [{ '?column?': 1 }] })
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('answers 500 in the A4 format when the database is unreachable', async () => {
    vi.spyOn(pool, 'query').mockRejectedValue(new Error('connect ECONNREFUSED'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Something went wrong. Try again.' })
  })

  it.skipIf(!process.env.TEST_HAS_DB)('reaches the real database', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
  })
})
