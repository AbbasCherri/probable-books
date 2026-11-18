// Seed the database from the frontend mock data (src/services/mock/index.js at the repo root).
// Uses DIRECT_URL. Flags: --reset (TRUNCATE first), --yes-wipe-production (needed with --reset in prod).
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { build } from 'esbuild'
import pg from 'pg'
import { connectionString } from '../connection.js'

const MOCK_ENTRY = fileURLToPath(
  new URL('../../../../src/services/mock/index.js', import.meta.url),
)

/** The mock uses extensionless imports (Vite style), so bundle it before loading it in Node. */
async function loadSeedData() {
  const out = await build({
    entryPoints: [MOCK_ENTRY],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    logLevel: 'error',
  })
  const code = out.outputFiles[0].text
  const mod = await import(
    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  )
  return mod.buildSeed({ now: Date.now() })
}

const json = (v) => JSON.stringify(v)

async function main() {
  const args = new Set(process.argv.slice(2))
  const reset = args.has('--reset')
  const prod = process.env.NODE_ENV === 'production'
  if (reset && prod && !args.has('--yes-wipe-production')) {
    throw new Error('Refusing --reset in production without --yes-wipe-production')
  }

  const seed = await loadSeedData()
  const passwords = new Set(seed.users.map((u) => u.password))
  const hashes = new Map()
  for (const p of passwords) hashes.set(p, await bcrypt.hash(p, 10)) // computed once, reused

  const client = new pg.Client({ connectionString: connectionString('DIRECT_URL') })
  await client.connect()
  try {
    await client.query('BEGIN')
    if (reset) {
      await client.query(
        'TRUNCATE offers, listing_photos, listing_courses, listings, courses, users RESTART IDENTITY CASCADE',
      )
    } else {
      const { rows } = await client.query('SELECT count(*)::int AS n FROM users')
      if (rows[0].n > 0) {
        throw new Error(
          'users table already has rows; use --reset (npm run seed:reset) to rebuild',
        )
      }
    }

    for (const u of seed.users) {
      await client.query(
        `INSERT INTO users (id, name, email, password_hash, year_of_study, usual_pickup_spot, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          u.id,
          u.name,
          u.email,
          hashes.get(u.password),
          u.yearOfStudy,
          u.usualPickupSpot,
          u.memberSince,
        ],
      )
    }
    for (const c of seed.courses) {
      await client.query(
        `INSERT INTO courses (code, title, required_materials, tips, related_codes)
         VALUES ($1,$2,$3::jsonb,$4,$5)`,
        [c.code, c.title, json(c.requiredMaterials), c.tips, c.relatedCodes],
      )
    }
    for (const l of seed.listings) {
      await client.query(
        `INSERT INTO listings (id, seller_id, title, category, condition, price_cents, pickup_spot,
           author, edition, isbn, brand, model, condition_notes, description, retail_cents,
           open_to_offers, status, featured, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        [
          l.id,
          l.sellerId,
          l.title,
          l.category,
          l.condition,
          l.priceCents,
          l.pickupSpot,
          l.author,
          l.edition,
          l.isbn,
          l.brand,
          l.model,
          l.conditionNotes,
          l.description,
          l.retailCents,
          l.openToOffers,
          l.status,
          l.featured,
          l.createdAt,
          l.updatedAt,
        ],
      )
    }
    for (const l of seed.listings) {
      for (const [i, code] of (l.courseCodes ?? []).entries()) {
        await client.query(
          'INSERT INTO listing_courses (listing_id, position, course_code) VALUES ($1,$2,$3)',
          [l.id, i, code],
        )
      }
    }
    for (const l of seed.listings) {
      for (const [i, p] of (l.photos ?? []).entries()) {
        await client.query(
          'INSERT INTO listing_photos (listing_id, position, url, alt) VALUES ($1,$2,$3,$4)',
          [l.id, i, p.url, p.alt],
        )
      }
    }
    for (const o of seed.offers) {
      await client.query(
        `INSERT INTO offers (id, listing_id, buyer_id, amount_cents, message, status, counter_cents, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
        [
          o.id,
          o.listingId,
          o.buyerId,
          o.amountCents,
          o.message,
          o.status,
          o.counterCents,
          o.createdAt,
        ],
      )
    }
    await client.query('COMMIT')
    console.log(
      `seed: inserted ${seed.users.length} users, ${seed.courses.length} courses, ` +
        `${seed.listings.length} listings, ${seed.offers.length} offers`,
    )
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(`seed: ${err.message}`)
  process.exit(1)
})
