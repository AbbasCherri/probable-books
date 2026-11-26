import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../src/app.js'

describe('GET /api/docs', () => {
  it('serves the machine-readable spec', async () => {
    const res = await request(app).get('/api/docs.json')
    expect(res.status).toBe(200)
    expect(res.body.openapi).toMatch(/^3\./)
    expect(res.body.components.securitySchemes.bearerAuth.scheme).toBe('bearer')
    expect(res.body.components.schemas.Error.required).toEqual(['message'])
    expect(res.body.paths['/api/health']).toBeDefined()
    expect(Object.keys(res.body.paths).every((p) => p.startsWith('/api/'))).toBe(true)
  })

  it('serves the interactive page', async () => {
    const res = await request(app).get('/api/docs/')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/html/)
    expect(res.text).toContain('swagger-ui')
  })
})
