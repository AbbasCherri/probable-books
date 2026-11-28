import { useEffect, useState } from 'react'

// The sell-form draft lives in localStorage (section 7, State), one per signed-in user, so
// the next person on a shared computer never sees it. Photos are left out: object URLs don't
// survive a reload.
const DRAFT_PREFIX = 'pb.sellDraft'
const LEGACY_KEY = 'pb.sellDraft' // older builds kept one draft for the whole browser
const draftKey = (userId) => `${DRAFT_PREFIX}.${userId}`

/** Drops the old shared draft: nobody can tell whose it was. */
function dropLegacyDraft() {
  try {
    window.localStorage.removeItem(LEGACY_KEY)
  } catch {
    // Storage blocked (private mode). Nothing to drop.
  }
}
const SAVE_DELAY_MS = 600

export function readDraft(userId) {
  dropLegacyDraft()
  if (!userId) return null
  try {
    const raw = window.localStorage.getItem(draftKey(userId))
    if (!raw) return null
    const { savedAt: _savedAt, ...form } = JSON.parse(raw)
    return form
  } catch {
    return null
  }
}

export function writeDraft(form, userId) {
  if (!userId) return false
  try {
    const { photos: _photos, ...rest } = form
    window.localStorage.setItem(
      draftKey(userId),
      JSON.stringify({ ...rest, savedAt: Date.now() }),
    )
    return true
  } catch {
    return false
  }
}

export function clearDraft(userId) {
  dropLegacyDraft()
  if (!userId) return
  try {
    window.localStorage.removeItem(draftKey(userId))
  } catch {
    // Storage blocked (private mode). Nothing to clear.
  }
}

/**
 * Saves the form a moment after the last change.
 * Returns 'idle' | 'saved' | 'failed' for the quiet "Draft saved" note.
 */
export function useDraftAutosave(form, enabled, userId) {
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    if (!enabled) return undefined
    const t = setTimeout(
      () => setStatus(writeDraft(form, userId) ? 'saved' : 'failed'),
      SAVE_DELAY_MS,
    )
    return () => clearTimeout(t)
  }, [form, enabled, userId])

  return status
}
