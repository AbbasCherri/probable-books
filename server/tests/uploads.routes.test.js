import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '../src/app.js'
import { sniffImageType } from '../src/routes/uploads.js'

// A real 1x1 PNG, plus minimal headers for the other types.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==',
  'base64',
)
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 1)])
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.alloc(4),
  Buffer.from('WEBPVP8 '),
])
const GIF = Buffer.from('GIF89a\x01\x00\x01\x00', 'latin1')

describe('sniffImageType', () => {
  it('recognises JPEG, PNG and WebP by their bytes only', () => {
    expect(sniffImageType(PNG)).toBe('image/png')
    expect(sniffImageType(JPEG)).toBe('image/jpeg')
    expect(sniffImageType(WEBP)).toBe('image/webp')
    expect(sniffImageType(GIF)).toBeNull()
    expect(sniffImageType(Buffer.from('<svg/>'))).toBeNull()
  })
})

describe.skipIf(!process.env.TEST_HAS_DB)('POST /api/uploads (real database)', () => {
  const tag = `upl${Date.now().toString(36)}`
  let pool
  let auth
  let userId

  beforeAll(async () => {
    ;({ pool } = await import('../src/db/pool.js'))
    const res = await request(app)
      .post('/api/auth/register')
      .set('X-Forwarded-For', '10.99.0.1')
      .send({ name: 'Uploader', email: `${tag}@test.invalid`, password: 'password123' })
    userId = res.body.user.id
    auth = { Authorization: `Bearer ${res.body.token}` }
  })
  afterAll(async () => {
    await pool.query('DELETE FROM uploads WHERE owner_id = $1', [userId])
    await pool.query('DELETE FROM users WHERE id = $1', [userId])
    await pool.end()
  })

  const upload = (buf, name = 'photo.png', type = 'image/png') =>
    request(app)
      .post('/api/uploads')
      .set(auth)
      .attach('photo', buf, { filename: name, contentType: type })

  it('stores a photo and serves it publicly at the returned url', async () => {
    const res = await upload(PNG)
    expect(res.status).toBe(201)
    expect(res.body.url).toMatch(
      /^http:\/\/127\.0\.0\.1:\d+\/api\/uploads\/upl_[0-9a-f]{32}$/,
    )
    const path = new URL(res.body.url).pathname

    const img = await request(app)
      .get(path)
      .buffer(true)
      .parse((r, cb) => {
        const chunks = []
        r.on('data', (c) => chunks.push(c))
        r.on('end', () => cb(null, Buffer.concat(chunks)))
      })
    expect(img.status).toBe(200)
    expect(img.headers['content-type']).toBe('image/png')
    expect(img.headers['cache-control']).toContain('immutable')
    expect(img.headers['cross-origin-resource-policy']).toBe('cross-origin')
    expect(Buffer.compare(img.body, PNG)).toBe(0)
  })

  it('accepts JPEG and WebP whatever name or type the browser claims', async () => {
    expect((await upload(JPEG, 'x.bin', 'application/octet-stream')).status).toBe(201)
    expect((await upload(WEBP, 'x.webp', 'image/webp')).status).toBe(201)
  })

  it('rejects other file types, even when renamed', async () => {
    for (const [buf, name] of [
      [GIF, 'a.gif'],
      [Buffer.from('not an image at all'), 'fake.png'],
    ]) {
      const res = await upload(buf, name, 'image/png')
      expect(res.status).toBe(422)
      expect(res.body).toEqual({
        message: 'Photos must be JPEG, PNG or WebP.',
        fields: { photo: 'Photos must be JPEG, PNG or WebP.' },
      })
    }
  })

  it('rejects files over 5 MB', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)])
    const res = await upload(big)
    expect(res.status).toBe(422)
    expect(res.body.fields).toEqual({ photo: 'Each photo must be 5 MB or smaller.' })
  })

  it('asks for a photo when none is sent', async () => {
    const none = await request(app).post('/api/uploads').set(auth).field('note', 'hi')
    expect(none.status).toBe(422)
    expect(none.body.fields).toEqual({ photo: 'Choose a photo to upload.' })
    const wrongField = await request(app)
      .post('/api/uploads')
      .set(auth)
      .attach('image', PNG, 'a.png')
    expect(wrongField.body.fields).toEqual({ photo: 'Choose a photo to upload.' })
  })

  it('needs sign-in to upload; unknown photos are 404', async () => {
    const res = await request(app).post('/api/uploads').attach('photo', PNG, 'a.png')
    expect(res.status).toBe(401)
    const missing = await request(app).get('/api/uploads/upl_nope')
    expect(missing.status).toBe(404)
    expect(missing.body).toEqual({ message: 'Photo not found.' })
  })
})
