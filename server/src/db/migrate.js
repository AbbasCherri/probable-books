// Migration runner. Uses DIRECT_URL (session advisory locks do not work through the pooler).
// Never edit a merged migration: add 002_*.sql instead.
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import pg from 'pg'
import { connectionString } from './connection.js'

const dir = new URL('./migrations/', import.meta.url)
const LOCK_ID = 443_001 // arbitrary app-wide advisory lock key

const sha = (text) => createHash('sha256').update(text).digest('hex')

async function withClient(fn) {
  const client = new pg.Client({ connectionString: connectionString('DIRECT_URL') })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

export async function migrateUp() {
  return withClient(async (client) => {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID])
    try {
      await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text PRIMARY KEY,
        checksum   text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`)
      const applied = new Map(
        (await client.query('SELECT name, checksum FROM schema_migrations')).rows.map(
          (r) => [r.name, r.checksum],
        ),
      )
      const files = (await readdir(dir))
        .filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'))
        .sort()
      const ran = []
      for (const file of files) {
        const sql = await readFile(new URL(file, dir), 'utf8')
        const checksum = sha(sql)
        if (applied.has(file)) {
          if (applied.get(file) !== checksum) {
            throw new Error(
              `Checksum mismatch for ${file}: it was edited after being applied. ` +
                'Never edit a merged migration; add a new 00N_*.sql file.',
            )
          }
          continue
        }
        try {
          await client.query('BEGIN')
          await client.query(sql)
          await client.query(
            'INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)',
            [file, checksum],
          )
          await client.query('COMMIT')
        } catch (err) {
          await client.query('ROLLBACK').catch(() => {})
          throw new Error(`Migration ${file} failed: ${err.message}`, { cause: err })
        }
        ran.push(file)
      }
      if (ran.length === 0) console.log('migrate: nothing to apply')
      else for (const f of ran) console.log(`migrate: applied ${f}`)
      return ran
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {})
    }
  })
}

export async function migrateDownDev() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('migrate:down:dev refuses to run when NODE_ENV=production')
  }
  if (!process.argv.includes('--i-know-this-wipes-data')) {
    throw new Error(
      'migrate:down:dev wipes data. Pass --i-know-this-wipes-data to confirm.',
    )
  }
  // Undo every migration, newest first (002 before 001).
  const downs = (await readdir(dir))
    .filter((f) => f.endsWith('.down.sql'))
    .sort()
    .reverse()
  await withClient(async (client) => {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID])
    try {
      await client.query('BEGIN')
      for (const file of downs)
        await client.query(await readFile(new URL(file, dir), 'utf8'))
      await client.query(
        'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
      )
      await client.query('DELETE FROM schema_migrations')
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      throw err
    }
  })
  console.log('migrate: rolled back every migration and cleared schema_migrations')
}

// CLI entry
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const down = process.argv.includes('--down-dev')
  ;(down ? migrateDownDev() : migrateUp()).catch((err) => {
    console.error(`migrate: ${err.message}`)
    process.exit(1)
  })
}
