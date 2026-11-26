// GET /api/courses and GET /api/courses/:code (requirements C2).
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import courses, { clearCoursesCache, normalizeCode } from '../src/routes/courses.js'
import {
  deleteCourses,
  deleteUsers,
  endPool,
  insertCourses,
  insertListing,
  insertUsers,
  makeApp,
  newTag,
  q,
} from './helpers/wazan.js'

const app = makeApp(courses)
// Test-only department, so other test files and seed data never collide.
const DEPT = 'WZC'
const C101 = `${DEPT} 101`
const C102 = `${DEPT} 102`
const C103 = `${DEPT} 103`
const MATERIALS = [
  {
    id: 'wzc101-text',
    label: 'Test book, 2nd edition',
    category: 'textbook',
    keywords: ['test'],
  },
]
let users

beforeAll(async () => {
  users = await insertUsers(newTag(), ['seller'])
  await insertCourses([
    {
      code: C101,
      title: 'Testing I',
      requiredMaterials: MATERIALS,
      tips: ['Any edition works.'],
      relatedCodes: [C102],
    },
    { code: C102, title: 'Testing II' },
    { code: C103, title: 'Testing III' },
  ])
  // C101: two active listings (1001 and 2000) plus one of every other status.
  const s = users.seller
  await insertListing(s, { price_cents: 2000 }, [C101])
  await insertListing(s, { price_cents: 1001 }, [C102, C101])
  await insertListing(s, { price_cents: 100, status: 'reserved' }, [C101])
  await insertListing(s, { price_cents: 200, status: 'sold' }, [C101])
  await insertListing(s, { price_cents: 300, status: 'draft' }, [C101])
})
afterAll(async () => {
  await deleteUsers(users) // listings and their course tags go with the user
  await deleteCourses([C101, C102, C103])
  await endPool()
})
beforeEach(() => clearCoursesCache())

describe('normalizeCode', () => {
  it('accepts every spelling in A1 and rejects the rest', () => {
    for (const input of ['chem201', 'CHEM-201', 'CHEM 201', 'Chem 201', ' chem-201 ']) {
      expect(normalizeCode(input), input).toBe('CHEM 201')
    }
    expect(normalizeCode('EE 230')).toBe('EE 230')
    for (const input of [
      'CHEMIS 201',
      'C 201',
      'CHEM 20',
      'CHEM  201',
      '201',
      '',
      null,
    ]) {
      expect(normalizeCode(input), String(input)).toBeNull()
    }
  })
})

describe('GET /api/courses', () => {
  it('returns every course in code order with the Course shape', async () => {
    const res = await request(app).get('/api/courses')
    expect(res.status).toBe(200)
    const codes = res.body.map((c) => c.code)
    expect(codes).toEqual([...codes].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)))

    const c101 = res.body.find((c) => c.code === C101)
    expect(c101).toEqual({
      code: C101,
      department: DEPT,
      number: '101',
      title: 'Testing I',
      requiredMaterials: MATERIALS,
      tips: ['Any edition works.'],
      relatedCodes: [C102],
      listingCount: 2,
    })
    expect(res.body.find((c) => c.code === C103)).toMatchObject({
      tips: [],
      relatedCodes: [],
      requiredMaterials: [],
      listingCount: 0,
    })
  })

  it('counts active listings only', async () => {
    const res = await request(app).get('/api/courses')
    expect(res.body.find((c) => c.code === C102).listingCount).toBe(1)
  })

  it('may reuse an answer up to 60 seconds old', async () => {
    const first = await request(app).get('/api/courses')
    const before = first.body.find((c) => c.code === C103).listingCount
    const id = await insertListing(users.seller, {}, [C103])
    try {
      const cached = await request(app).get('/api/courses')
      expect(cached.body.find((c) => c.code === C103).listingCount).toBe(before)
      clearCoursesCache()
      const fresh = await request(app).get('/api/courses')
      expect(fresh.body.find((c) => c.code === C103).listingCount).toBe(before + 1)
    } finally {
      await q('DELETE FROM listings WHERE id = $1', [id])
    }
  })
})

describe('GET /api/courses/:code', () => {
  it('returns the course with stats over active listings', async () => {
    const res = await request(app).get(`/api/courses/${DEPT}-101`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      code: C101,
      department: DEPT,
      number: '101',
      title: 'Testing I',
      requiredMaterials: MATERIALS,
      tips: ['Any edition works.'],
      relatedCodes: [C102],
      // Median of 1001 and 2000 is 1500.5, rounded to a whole cent.
      stats: { listingCount: 2, minCents: 1001, medianCents: 1501 },
    })
  })

  it('accepts any spelling of the code', async () => {
    for (const path of [`${DEPT}-101`, 'wzc101', encodeURIComponent(C101), 'Wzc-101']) {
      const res = await request(app).get(`/api/courses/${path}`)
      expect(res.status, path).toBe(200)
      expect(res.body.code).toBe(C101)
    }
  })

  it('a course with no active listings has null stats', async () => {
    const res = await request(app).get(`/api/courses/${DEPT}-103`)
    expect(res.status).toBe(200)
    expect(res.body.stats).toEqual({ listingCount: 0, minCents: null, medianCents: null })
  })

  it('404 for an unknown code, suggesting the same department', async () => {
    const res = await request(app).get(`/api/courses/${DEPT.toLowerCase()}-999`)
    expect(res.status).toBe(404)
    expect(res.body).toEqual({
      message: `No ${DEPT} 999 in the index.`,
      closest: [C101, C102, C103],
    })
  })

  it('404 suggests the first 3 courses when the department has none', async () => {
    const first3 = (
      await q(
        `SELECT code::text AS code FROM courses ORDER BY code::text COLLATE "C" LIMIT 3`,
      )
    ).map((r) => r.code)
    const res = await request(app).get('/api/courses/QQQQ-999')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'No QQQQ 999 in the index.', closest: first3 })
  })

  it('404 repeats input that is not a valid code as typed', async () => {
    const res = await request(app).get(`/api/courses/${encodeURIComponent('wzc stuff')}`)
    expect(res.status).toBe(404)
    // Its leading letters still find the department.
    expect(res.body).toEqual({
      message: 'No wzc stuff in the index.',
      closest: [C101, C102, C103],
    })
  })
})
