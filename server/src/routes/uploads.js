// Owner: Ayk (@Ayk-12)
// Endpoints: POST /uploads, GET /uploads/:id (serves the stored photo)

import { Router } from 'express'
import multer from 'multer'
import { pool } from '../db/pool.js'
import { HttpError, validationError } from '../lib/errors.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const UPLOAD_MESSAGES = {
  type: 'Photos must be JPEG, PNG or WebP.',
  size: 'Each photo must be 5 MB or smaller.',
  missing: 'Choose a photo to upload.',
  notFound: 'Photo not found.',
}

// Kept in memory (at most 5 MB, one file) and then written to the uploads table.
const parse = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 5 },
}).single('photo')

/** Runs multer and turns its errors into the A4 field messages. */
function readPhoto(req, res, next) {
  parse(req, res, (err) => {
    if (!err) return next()
    if (err.code === 'LIMIT_FILE_SIZE')
      return next(validationError({ photo: UPLOAD_MESSAGES.size }))
    if (err instanceof multer.MulterError)
      return next(validationError({ photo: UPLOAD_MESSAGES.missing }))
    next(err)
  })
}

/**
 * The image type from the file's first bytes. The browser-supplied type is not trusted: a
 * renamed file must not be stored and served as an image.
 */
export function sniffImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return 'image/jpeg'
  if (
    buf.length >= 8 &&
    buf
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return 'image/png'
  if (
    buf.length >= 12 &&
    buf.toString('latin1', 0, 4) === 'RIFF' &&
    buf.toString('latin1', 8, 12) === 'WEBP'
  )
    return 'image/webp'
  return null
}

/** Absolute address of a stored photo. PUBLIC_API_URL wins when the API sits behind a proxy. */
function photoUrl(req, id) {
  const base = (
    process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`
  ).replace(/\/+$/, '')
  return `${base}/api/uploads/${id}`
}

/**
 * @openapi
 * /api/uploads:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload one listing photo
 *     description: Called once per photo before the listing is saved. Put the returned url in the listing's photos.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [photo]
 *             properties:
 *               photo: { type: string, format: binary, description: 'One JPEG, PNG or WebP image, at most 5 MB.' }
 *     responses:
 *       201:
 *         description: Stored. The url is public and permanent.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url: { type: string, example: 'https://api.example/api/uploads/upl_4f1c...' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       422: { $ref: '#/components/responses/Unprocessable' }
 */
router.post('/uploads', requireAuth, readPhoto, async (req, res) => {
  if (!req.file || req.file.size === 0)
    throw validationError({ photo: UPLOAD_MESSAGES.missing })
  const type = sniffImageType(req.file.buffer)
  if (!type) throw validationError({ photo: UPLOAD_MESSAGES.type })
  const { rows } = await pool.query(
    `INSERT INTO uploads (owner_id, content_type, byte_size, data) VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [req.user.id, type, req.file.size, req.file.buffer],
  )
  res.status(201).json({ url: photoUrl(req, rows[0].id) })
})

/**
 * @openapi
 * /api/uploads/{id}:
 *   get:
 *     tags: [Uploads]
 *     summary: A stored photo
 *     description: Public, cacheable forever. This is the address returned by POST /api/uploads.
 *     security: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: The image.
 *         content:
 *           image/jpeg: {}
 *           image/png: {}
 *           image/webp: {}
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/uploads/:id', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT content_type, data FROM uploads WHERE id = $1',
    [req.params.id],
  )
  if (!rows[0]) throw new HttpError(404, UPLOAD_MESSAGES.notFound)
  res.set({
    'Content-Type': rows[0].content_type,
    // Photos never change once stored, so browsers and CDNs may keep them for a year.
    'Cache-Control': 'public, max-age=31536000, immutable',
    // The web app runs on another origin; helmet's default (same-origin) would block <img>.
    'Cross-Origin-Resource-Policy': 'cross-origin',
  })
  res.send(rows[0].data)
})

export default router
