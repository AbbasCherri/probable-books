import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '../src/app.js'
import { int, list, one } from '../src/lib/query.js'

describe('query helpers', () => {
  it('list reads repeated and comma-separated values', () => {
    expect(list(['CHEM-201', 'BIOL-201,MATH 101 '])).toEqual([
      'CHEM-201',
      'BIOL-201',
      'MATH 101',
    ])
    expect(list(undefined)).toEqual([])
    expect(list(',,')).toEqual([])
  })
  it('int accepts plain integers only', () => {
    expect(int('12')).toBe(12)
    expect(int('-3')).toBe(-3)
    expect(int(['5', '6'])).toBe(5)
    expect(int('1.5')).toBeNull()
    expect(int('abc')).toBeNull()
    expect(int(undefined)).toBeNull()
  })
  it('one takes the first repeated value', () => expect(one(['a', 'b'])).toBe('a'))
})

const LISTING_KEYS = [
  'author',
  'brand',
  'category',
  'condition',
  'conditionNotes',
  'courseCodes',
  'createdAt',
  'description',
  'edition',
  'featured',
  'id',
  'isbn',
  'model',
  'openToOffers',
  'photos',
  'pickupSpot',
  'priceCents',
  'retailCents',
  'sellerId',
  'status',
  'title',
  'updatedAt',
]
const RANK = { new: 0, like_new: 1, good: 2, fair: 3, worn: 4 }

/** True when every neighbouring pair satisfies cmp(a, b) <= 0. */
const ordered = (items, cmp) =>
  items.every((x, i) => i === 0 || cmp(items[i - 1], x) <= 0)
const newestFirst = (a, b) =>
  b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)

describe.skipIf(!process.env.TEST_HAS_DB)('GET /api/listings (seeded database)', () => {
  const get = (qs = '') => request(app).get(`/api/listings${qs}`)
  let all // every visible listing, newest first
  let pool

  beforeAll(async () => {
    ;({ pool } = await import('../src/db/pool.js'))
    const first = await get('?pageSize=100')
    const rest = []
    for (let p = 2; (p - 1) * 100 < first.body.total; p++) {
      rest.push(...(await get(`?pageSize=100&page=${p}`)).body.items)
    }
    all = [...first.body.items, ...rest]
  })
  afterAll(() => pool?.end())

  it('defaults to page 1 of 24, newest first, with the A6 shape', async () => {
    const res = await get()
    expect(res.status).toBe(200)
    expect(res.body.page).toBe(1)
    expect(res.body.pageSize).toBe(24)
    expect(res.body.items).toHaveLength(Math.min(24, res.body.total))
    expect(Object.keys(res.body.items[0]).sort()).toEqual(LISTING_KEYS)
    expect(ordered(res.body.items, newestFirst)).toBe(true)
    expect(res.body.items[0].createdAt).toMatch(/^\d{4}-\d\d-\d\dT.*Z$/)
  })

  it('never returns drafts, but returns active, reserved and sold', async () => {
    const statuses = new Set(all.map((l) => l.status))
    expect(statuses.has('draft')).toBe(false)
    for (const s of ['active', 'reserved', 'sold']) expect(statuses.has(s)).toBe(true)
    const { rows } = await pool.query(
      `SELECT count(*)::int n FROM listings WHERE status <> 'draft'`,
    )
    expect(all).toHaveLength(rows[0].n)
  })

  it('pages are stable: small pages concatenate to the full list', async () => {
    const walk = async (sort, size) => {
      const ids = []
      for (let p = 1; (p - 1) * size < all.length; p++) {
        const res = await get(`?sort=${sort}&pageSize=${size}&page=${p}`)
        ids.push(...res.body.items.map((l) => l.id))
      }
      return ids
    }
    for (const sort of ['newest', 'price_asc', 'price_desc', 'condition']) {
      const big = await walk(sort, 50)
      expect(new Set(big).size).toBe(all.length) // no repeats, no gaps
      expect(await walk(sort, 13)).toEqual(big)
    }
  }, 90_000)

  it('sorts by price and by condition, ties by newest', async () => {
    const asc = (await get('?sort=price_asc&pageSize=100')).body.items
    expect(ordered(asc, (a, b) => a.priceCents - b.priceCents || newestFirst(a, b))).toBe(
      true,
    )
    const desc = (await get('?sort=price_desc&pageSize=100')).body.items
    expect(
      ordered(desc, (a, b) => b.priceCents - a.priceCents || newestFirst(a, b)),
    ).toBe(true)
    const cond = (await get('?sort=condition&pageSize=100')).body.items
    expect(
      ordered(cond, (a, b) => RANK[a.condition] - RANK[b.condition] || newestFirst(a, b)),
    ).toBe(true)
  })

  it('searches title, author, isbn, brand and model ignoring case', async () => {
    const sample = all.find((l) => l.author)
    const word = sample.author.split(' ').pop().toUpperCase()
    const res = await get(`?q=${encodeURIComponent(word)}&pageSize=100`)
    const expected = all.filter((l) =>
      [l.title, l.author, l.isbn, l.brand, l.model].some((f) =>
        f?.toLowerCase().includes(word.toLowerCase()),
      ),
    )
    expect(res.body.items.map((l) => l.id).sort()).toEqual(
      expected.map((l) => l.id).sort(),
    )
    expect((await get('?q=%20%20')).body.total).toBe(all.length)
    expect((await get('?q=%25')).body.total).toBe(0) // "%" is literal, not a wildcard
  })

  it('filters by course in any spelling, repeated or comma-separated (OR)', async () => {
    const [a, b] = [...new Set(all.flatMap((l) => l.courseCodes))]
    const slug = (c) => c.replace(' ', '-').toLowerCase()
    const one = await get(`?course=${slug(a)}&pageSize=100`)
    expect(one.body.items.every((l) => l.courseCodes.includes(a))).toBe(true)
    expect(one.body.total).toBe(all.filter((l) => l.courseCodes.includes(a)).length)

    const either = all.filter(
      (l) => l.courseCodes.includes(a) || l.courseCodes.includes(b),
    )
    const repeated = await get(`?course=${slug(a)}&course=${encodeURIComponent(b)}`)
    const comma = await get(`?course=${a.replace(' ', '')},${slug(b)}`)
    expect(repeated.body.total).toBe(either.length)
    expect(comma.body.total).toBe(either.length)
  })

  it('combines different filters with AND', async () => {
    const res = await get('?category=textbook,calculator&condition=good&condition=new')
    const expected = all.filter(
      (l) =>
        ['textbook', 'calculator'].includes(l.category) &&
        ['good', 'new'].includes(l.condition),
    )
    expect(res.body.total).toBe(expected.length)
    expect(res.body.total).toBeGreaterThan(0)
  })

  it('price bounds are inclusive and swapped when reversed', async () => {
    const prices = all.map((l) => l.priceCents).sort((x, y) => x - y)
    const lo = prices[5]
    const hi = prices[prices.length - 6]
    const expected = all.filter((l) => l.priceCents >= lo && l.priceCents <= hi).length
    expect((await get(`?minPrice=${lo}&maxPrice=${hi}`)).body.total).toBe(expected)
    expect((await get(`?minPrice=${hi}&maxPrice=${lo}`)).body.total).toBe(expected)
  })

  it('openToOffers=true filters; any other value does not', async () => {
    const open = all.filter((l) => l.openToOffers).length
    expect((await get('?openToOffers=true')).body.total).toBe(open)
    expect((await get('?openToOffers=yes')).body.total).toBe(all.length)
  })

  it('ignores unknown values instead of failing', async () => {
    const res = await get(
      '?course=XYZ-999&category=boat&condition=mint&sort=random&page=abc&pageSize=-4',
    )
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(all.length)
    expect(res.body.page).toBe(1)
    expect(res.body.pageSize).toBe(24)
  })

  it('caps pageSize at 100 and returns empty items past the end', async () => {
    expect((await get('?pageSize=500')).body.pageSize).toBe(100)
    const past = await get('?page=999')
    expect(past.status).toBe(200)
    expect(past.body.items).toEqual([])
    expect(past.body.total).toBe(all.length)
  })
})
