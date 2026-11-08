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

const TAB_COLORS = ['sage', 'sky', 'butter', 'rose', 'lilac', 'sand']

// Same department, same colour, everywhere.
export function tabColorFor(code) {
  const dept = departmentOf(code)
  let h = 0
  for (const ch of dept) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return TAB_COLORS[h % TAB_COLORS.length]
}
