import pg from 'pg'
import { connectionString } from './connection.js'

// Pooled (pgbouncer) connection string: use it for request traffic only.
export const pool = new pg.Pool({
  connectionString: connectionString('DATABASE_URL'),
  max: 5,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
})

/** Run `fn(client)` inside one transaction; roll back on error. */
export async function withTransaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}
