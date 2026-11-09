// Course codes display as "CHEM 201" and appear in URLs as "CHEM-201".
const CODE_RE = /^([A-Za-z]{2,4})[\s-]?(\d{3})$/

export function normalizeCode(input) {
  const m = CODE_RE.exec(String(input).trim())
  return m ? `${m[1].toUpperCase()} ${m[2]}` : null
}

export function codeToSlug(code) {
  return code.replace(' ', '-')
}

export function slugToCode(slug) {
  return normalizeCode(slug)
}

export function departmentOf(code) {
  return code.split(' ')[0]
}

const compact = (s) => String(s).toUpperCase().replace(/[\s-]/g, '')

/**
 * How well one course matches a typed query, or null. rank: 0 exact code, 1 code prefix,
 * 2 code substring, 3 title substring. index/length locate the match in course[field] (the
 * display string, so "chem201" highlights all of "CHEM 201").
 */
export function matchCourse(course, query) {
  const raw = String(query ?? '').trim()
  const q = compact(raw)
  if (!q) return null
  const code = compact(course.code)
  const at = code.indexOf(q)
  if (at >= 0) {
    // Map compact positions back to the display code, which has a space after the department.
    const gap = course.code.indexOf(' ')
    const toDisplay = (i) => (gap >= 0 && i >= gap ? i + 1 : i)
    const start = toDisplay(at)
    const end = toDisplay(at + q.length - 1) + 1
    const rank = code === q ? 0 : at === 0 ? 1 : 2
    return { rank, field: 'code', index: start, length: end - start }
  }
  const t = course.title?.toLowerCase().indexOf(raw.toLowerCase()) ?? -1
  if (t >= 0) return { rank: 3, field: 'title', index: t, length: raw.length }
  return null
}

/** Courses matching a query, best first (exact code, code prefix, code substring, title). */
export function matchCourses(courses, query, { exclude = [], limit = 8 } = {}) {
  const skip = new Set(exclude)
  return courses
    .filter((c) => !skip.has(c.code))
    .map((course) => ({ course, m: matchCourse(course, query) }))
    .filter((x) => x.m)
    .sort((a, b) => a.m.rank - b.m.rank || a.course.code.localeCompare(b.course.code))
    .slice(0, limit)
    .map((x) => x.course)
}

const TAB_COLORS = ['sage', 'sky', 'butter', 'rose', 'lilac', 'sand']

// Same department, same colour, everywhere.
export function tabColorFor(code) {
  const dept = departmentOf(code)
  let h = 0
  for (const ch of dept) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return TAB_COLORS[h % TAB_COLORS.length]
}
