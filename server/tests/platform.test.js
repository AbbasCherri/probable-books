import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../src/app.js'
import { errorHandler, HttpError, validationError } from '../src/lib/errors.js'
import { normalizeCourseCode } from '../src/lib/courseCodes.js'
import { allowedOrigins } from '../src/middleware/cors.js'

describe('A4 error format', () => {
  it('unknown routes answer 404 JSON', async () => {
    const res = await request(app).get('/api/nope')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'Not found.' })
  })

  it('malformed JSON answers 400', async () => {
    const res = await request(app)
      .post('/api/listings')
      .set('Content-Type', 'application/json')
      .send('{"title": ')
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'That request could not be read.' })
  })

  it('unexpected failures answer 500 with no detail', async () => {
    const boom = express()
    boom.get('/boom', () => {
      throw new Error('secret stack detail')
    })
    boom.use(errorHandler)
    const err = console.error
    console.error = () => {}
    const res = await request(boom).get('/boom')
    console.error = err
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Something went wrong. Try again.' })
  })

  it('HttpError keeps status, fields and closest', async () => {
    const t = express()
    t.get('/f', () => {
      throw validationError({ a: 'First.', b: 'Second.' })
    })
    t.get('/c', () => {
      throw new HttpError(404, 'No CHEM 999 in the index.', { closest: ['CHEM 201'] })
    })
    t.use(errorHandler)
    const f = await request(t).get('/f')
    expect(f.status).toBe(422)
    expect(f.body).toEqual({
      message: 'First. Second.',
      fields: { a: 'First.', b: 'Second.' },
    })
    const c = await request(t).get('/c')
    expect(c.body.closest).toEqual(['CHEM 201'])
  })
})

describe('CORS', () => {
  it('allows the local dev app by default', async () => {
    const res = await request(app).get('/api/nope').set('Origin', 'http://localhost:5173')
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  })
  it('does not allow other origins', async () => {
    const res = await request(app).get('/api/nope').set('Origin', 'https://evil.example')
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
  it('reads a comma-separated CORS_ORIGIN', () => {
    expect(allowedOrigins('https://a.example/, http://localhost:5173')).toEqual([
      'https://a.example',
      'http://localhost:5173',
    ])
  })
})

describe('course codes', () => {
  it.each([
    ['chem201', 'CHEM 201'],
    ['CHEM-201', 'CHEM 201'],
    [' Chem 201 ', 'CHEM 201'],
    ['CS 101', 'CS 101'],
  ])('%s -> %s', (input, out) => expect(normalizeCourseCode(input)).toBe(out))
  it.each(['C 201', 'CHEMIS 201', 'CHEM 2011', '', null])('rejects %s', (input) =>
    expect(normalizeCourseCode(input)).toBeNull(),
  )
})
