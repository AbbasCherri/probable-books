// Owner: Abbas (@AbbasCherri)
// Endpoint: GET /health (P1)

import { Router } from 'express'
import { pool } from '../db/pool.js'

export const health = Router()

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Platform]
 *     summary: API and database are up
 *     description: Answers 200 only when the database is reachable through the pool.
 *     security: []
 *     responses:
 *       200:
 *         description: Up.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, enum: [ok] }
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Errors (database unreachable) fall through to the A4 handler as a plain 500.
health.get('/health', async (_req, res) => {
  await pool.query('select 1')
  res.json({ status: 'ok' })
})
