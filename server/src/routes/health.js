import { Router } from 'express'
import { pool } from '../db/pool.js'

export const health = Router()

// GET /api/health: confirms the API is up and can reach the database through the pooler.
health.get('/health', async (_req, res) => {
  try {
    await pool.query('select 1')
    res.json({ status: 'ok', db: 'up' })
  } catch {
    res.status(503).json({ status: 'error', db: 'down' })
  }
})
