/**
 * Ends a sentence that finishes on `text` with a period, unless it already ends in one
 * (a name like "Lina K."), or in ? or !.
 *   `Sent to ${endSentence(name)} Track it…`
 */
export function endSentence(text) {
  const t = String(text ?? '').trimEnd()
  return /[.!?]$/.test(t) ? t : `${t}.`
}
