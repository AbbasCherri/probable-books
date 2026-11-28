// Owner: Wazan (@awazzan2)
// Endpoints: GET /courses, GET /courses/:code
//
// The course index (requirements C2). Courses are seeded and read-only through the API.

import { Router } from 'express'
import { pool } from '../db/pool.js'

const router = Router()

// The header lookup asks for every course each time it opens. The spec allows answers up
// to 60 seconds old, so the whole list is kept in memory for that long.
const COURSES_TTL_MS = 60_000
const CLOSEST_FALLBACK = 3

// chem201, CHEM-201 and CHEM 201 (any capitalization) are all accepted (A1).
const CODE_RE = /^([A-Za-z]{2,4})[\s-]?(\d{3})$/

/** Any accepted spelling -> "CHEM 201", or null when it is not a course code. */
export function normalizeCode(input) {
  const m = CODE_RE.exec(String(input ?? '').trim())
  return m ? `${m[1].toUpperCase()} ${m[2]}` : null
}

/** Database row -> Course (A6), without listingCount. */
function toCourse(row) {
  return {
    code: row.code,
    department: row.department,
    number: row.number,
    title: row.title,
    requiredMaterials: row.required_materials,
    tips: row.tips,
    relatedCodes: row.related_codes,
  }
}

// course_code is a domain over text; casting gives node-postgres a plain text value.
const COURSE_COLUMNS = `c.code::text AS code, c.department, c.number, c.title,
  c.required_materials, c.tips, c.related_codes::text[] AS related_codes`

let cache = null // { at, promise }

/** Forget the cached course list (tests, or after reseeding). */
export function clearCoursesCache() {
  cache = null
}

async function loadCourses() {
  const { rows } = await pool.query(
    `SELECT ${COURSE_COLUMNS},
            (SELECT count(*)::int
               FROM listing_courses lc JOIN listings l ON l.id = lc.listing_id
              WHERE lc.course_code = c.code AND l.status <> 'draft') AS listing_count
       FROM courses c
      ORDER BY c.code::text COLLATE "C"`,
  )
  return rows.map((row) => ({ ...toCourse(row), listingCount: row.listing_count }))
}

/**
 * @openapi
 * /courses:
 *   get:
 *     tags: [Courses]
 *     summary: The full course index
 *     description: |
 *       Access: Public. Owner: Wazan. Every course in one response, ordered by code.
 *       listingCount counts every listing Browse shows (active, reserved and sold, not
 *       drafts), so it matches the number of results when you filter by the course. Answers
 *       may be up to 60 seconds old.
 *     responses:
 *       200:
 *         description: All courses.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Course' }
 *
 * components:
 *   schemas:
 *     CourseMaterial:
 *       type: object
 *       required: [id, label, category, keywords]
 *       properties:
 *         id: { type: string, example: chem201-text }
 *         label: { type: string, example: 'Organic Chemistry (Klein), 4th edition' }
 *         category: { type: string, enum: [textbook, calculator, lab_gear, other] }
 *         keywords:
 *           type: array
 *           items: { type: string }
 *           example: [organic, klein]
 *     CourseFields:
 *       type: object
 *       required: [code, department, number, title, requiredMaterials, tips, relatedCodes]
 *       properties:
 *         code: { type: string, example: CHEM 201 }
 *         department: { type: string, example: CHEM }
 *         number: { type: string, example: '201' }
 *         title: { type: string, example: Organic Chemistry I }
 *         requiredMaterials:
 *           type: array
 *           items: { $ref: '#/components/schemas/CourseMaterial' }
 *         tips:
 *           type: array
 *           items: { type: string }
 *           example: ['The 3rd edition works. Problem numbers shift in ch. 7 to 9.']
 *         relatedCodes:
 *           type: array
 *           items: { type: string }
 *           example: [CHEM 202, BIOL 201]
 *     Course:
 *       description: A course in the course list (A6).
 *       allOf:
 *         - $ref: '#/components/schemas/CourseFields'
 *         - type: object
 *           required: [listingCount]
 *           properties:
 *             listingCount:
 *               type: integer
 *               description: Active listings tagged with the course.
 *               example: 5
 *     CourseDetail:
 *       description: One course with price statistics over its active listings (A6).
 *       allOf:
 *         - $ref: '#/components/schemas/CourseFields'
 *         - type: object
 *           required: [stats]
 *           properties:
 *             stats:
 *               type: object
 *               required: [listingCount, minCents, medianCents]
 *               properties:
 *                 listingCount: { type: integer, example: 5 }
 *                 minCents: { type: integer, nullable: true, example: 500 }
 *                 medianCents:
 *                   type: integer
 *                   nullable: true
 *                   description: Median asking price, rounded to a whole cent.
 *                   example: 1200
 */
router.get('/courses', async (_req, res) => {
  if (!cache || Date.now() - cache.at > COURSES_TTL_MS) {
    // Share one query between requests that arrive while it is running.
    const promise = loadCourses()
    cache = { at: Date.now(), promise }
    promise.catch(() => {
      if (cache?.promise === promise) cache = null // never cache a failure
    })
  }
  res.json(await cache.promise)
})

/**
 * Suggestions for an unknown code: other courses in the same department, or the first
 * three courses when there are none. For input that is not a valid code, its leading
 * letters stand in for the department ("chemistry" suggests CHEM courses).
 */
async function closestCodes(input) {
  const department = /^\s*([A-Za-z]{2,4})/.exec(input)?.[1].toUpperCase()
  if (department) {
    const { rows } = await pool.query(
      `SELECT code::text AS code FROM courses WHERE department = $1
        ORDER BY code::text COLLATE "C"`,
      [department],
    )
    if (rows.length) return rows.map((r) => r.code)
  }
  const { rows } = await pool.query(
    `SELECT code::text AS code FROM courses ORDER BY code::text COLLATE "C" LIMIT $1`,
    [CLOSEST_FALLBACK],
  )
  return rows.map((r) => r.code)
}

/**
 * @openapi
 * /courses/{code}:
 *   get:
 *     tags: [Courses]
 *     summary: One course with its materials and price statistics
 *     description: |
 *       Access: Public. Owner: Wazan. Stats cover active listings tagged with the course;
 *       with none, listingCount is 0 and minCents and medianCents are null.
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *         description: Any accepted spelling, for example CHEM-201, chem201 or "CHEM 201".
 *         example: CHEM-201
 *     responses:
 *       200:
 *         description: The course.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CourseDetail' }
 *       404:
 *         description: |
 *           No course with that code, or not a valid code. "No CHEM 999 in the index."
 *           (input that is not a valid code appears as typed). `closest` lists other codes
 *           in the same department, or if none, the first 3 courses.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { message: No CHEM 999 in the index., closest: [CHEM 201, CHEM 202] }
 */
router.get('/courses/:code', async (req, res) => {
  const raw = req.params.code
  const code = normalizeCode(raw)
  const { rows } = code
    ? await pool.query(`SELECT ${COURSE_COLUMNS} FROM courses c WHERE c.code = $1`, [
        code,
      ])
    : { rows: [] }
  if (!rows[0]) {
    return res.status(404).json({
      message: `No ${code ?? raw} in the index.`,
      closest: await closestCodes(code ?? raw),
    })
  }

  // Stats cover active listings only. The median is rounded as numeric, so .5 rounds up.
  const stats = await pool.query(
    `SELECT count(*)::int AS listing_count,
            min(l.price_cents) AS min_cents,
            round((percentile_cont(0.5) WITHIN GROUP (ORDER BY l.price_cents))::numeric)::int
              AS median_cents
       FROM listings l JOIN listing_courses lc ON lc.listing_id = l.id
      WHERE lc.course_code = $1 AND l.status = 'active'`,
    [code],
  )
  const s = stats.rows[0]
  res.json({
    ...toCourse(rows[0]),
    stats: {
      listingCount: s.listing_count,
      minCents: s.min_cents,
      medianCents: s.median_cents,
    },
  })
})

export default router
