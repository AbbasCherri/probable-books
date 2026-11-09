import { useSyncExternalStore } from 'react'
import { THEME_KEY } from '@/lib/constants'

// Night reading (section 10). The choice is 'system' | 'day' | 'night', saved raw under pb.theme
// ('system' saves nothing). <html data-theme> carries it; index.html sets it before first paint.
// One store for the whole page, so the footer control and the menu control stay in sync, and a
// change made in another tab (storage event) lands here too.

const DARK_QUERY = '(prefers-color-scheme: dark)'
const listeners = new Set()
const parse = (v) => (v === 'day' || v === 'night' ? v : 'system')

// The saved choice; if storage is blocked or empty, what <html data-theme> already shows (the
// index.html script, or a setTheme() whose save failed).
function readSaved() {
  try {
    const saved = parse(localStorage.getItem(THEME_KEY))
    if (saved !== 'system') return saved
  } catch {
    // Storage blocked: fall through to the attribute.
  }
  return parse(document.documentElement.getAttribute('data-theme'))
}

// The store's snapshot. Kept here, not re-read from storage on every render, so a choice still
// sticks for this page when storage refuses to save it.
let current = typeof document === 'undefined' ? 'system' : readSaved()
const getSnapshot = () => current

function apply(theme) {
  const html = document.documentElement
  if (theme === 'system') html.removeAttribute('data-theme')
  else html.setAttribute('data-theme', theme)
}

function emit() {
  listeners.forEach((notify) => notify())
}

// Another tab saved a choice (or cleared storage: key null).
function onStorage(event) {
  if (event.key !== THEME_KEY && event.key !== null) return
  let saved = event.newValue
  try {
    saved = localStorage.getItem(THEME_KEY)
  } catch {
    // Keep the value the event carried.
  }
  current = parse(saved)
  apply(current)
  emit()
}

function subscribe(notify) {
  listeners.add(notify)
  if (listeners.size === 1) {
    // First control on the page: catch up with anything that changed while none was mounted.
    current = readSaved()
    window.addEventListener('storage', onStorage)
  }
  return () => {
    listeners.delete(notify)
    if (listeners.size === 0) window.removeEventListener('storage', onStorage)
  }
}

function subscribeSystem(notify) {
  const mq = window.matchMedia?.(DARK_QUERY)
  mq?.addEventListener('change', notify)
  return () => mq?.removeEventListener('change', notify)
}

const systemIsDark = () => Boolean(window.matchMedia?.(DARK_QUERY).matches)

export function setTheme(next) {
  const theme = parse(next)
  current = theme
  try {
    if (theme === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Storage blocked: the choice still applies to this page.
  }
  apply(theme)
  emit()
}

/**
 * const [theme, setTheme, resolved] = useTheme()
 *   theme     'system' | 'day' | 'night', the reader's choice
 *   setTheme  saves and applies a choice, everywhere on the page
 *   resolved  'day' | 'night', what is showing now (system follows prefers-color-scheme)
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => 'system')
  const dark = useSyncExternalStore(subscribeSystem, systemIsDark, () => false)
  const resolved = theme === 'system' ? (dark ? 'night' : 'day') : theme
  return [theme, setTheme, resolved]
}
