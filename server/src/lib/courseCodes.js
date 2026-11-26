// Course codes (requirements A1): two to four letters and three digits. Requests may send
// chem201, CHEM-201 or CHEM 201 in any capitalisation; responses always use "CHEM 201".
const CODE_RE = /^([A-Za-z]{2,4})[\s-]?(\d{3})$/

/** Spaced, upper-case form, or null when the input is not a valid course code. */
export function normalizeCourseCode(input) {
  if (typeof input !== 'string') return null
  const m = CODE_RE.exec(input.trim())
  return m ? `${m[1].toUpperCase()} ${m[2]}` : null
}
