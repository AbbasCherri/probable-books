import { useEffect, useState } from 'react'

// The sell-form draft lives in localStorage (section 7, State).
// Photos are left out: object URLs don't survive a reload.
const DRAFT_KEY = 'pb.sellDraft'
const SAVE_DELAY_MS = 600

export function readDraft() {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const { savedAt: _savedAt, ...form } = JSON.parse(raw)
    return form
  } catch {
    return null
  }
}

export function writeDraft(form) {
  try {
    const { photos: _photos, ...rest } = form
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...rest, savedAt: Date.now() }),
    )
    return true
  } catch {
    return false
  }
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Storage blocked (private mode). Nothing to clear.
  }
}

/**
 * Saves the form a moment after the last change.
 * Returns 'idle' | 'saved' | 'failed' for the quiet "Draft saved" note.
 */
export function useDraftAutosave(form, enabled) {
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    if (!enabled) return undefined
    const t = setTimeout(
      () => setStatus(writeDraft(form) ? 'saved' : 'failed'),
      SAVE_DELAY_MS,
    )
    return () => clearTimeout(t)
  }, [form, enabled])

  return status
}
