import { useSyncExternalStore } from 'react'
import { THEME_KEY } from '@/lib/constants'

// Night reading (section 10). The choice is 'system' | 'day' | 'night', saved raw under pb.theme
// ('system' saves nothing). <html data-theme> carries it; index.html sets it before first paint.
// One store for the whole page, so the footer control and the menu control stay in sync, and a
// change made in another tab (storage event) lands here too.

const DARK_QUERY = '(prefers-color-scheme: dark)'
const listeners = new Set()

function read() {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'day' || v === 'night' ? v : 'system'
  } catch {
    return 'system'
  }
}

function apply(theme) {
  const html = document.documentElement
  if (theme === 'system') html.removeAttribute('data-theme')
  else html.setAttribute('data-theme', theme)
}

function emit() {
  listeners.forEach((notify) => notify())
}

function onStorage(event) {
  if (event.key !== THEME_KEY && event.key !== null) return
  apply(read())
  emit()
}

function subscribe(notify) {
  listeners.add(notify)
  if (listeners.size === 1) window.addEventListener('storage', onStorage)
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
  const theme = next === 'day' || next === 'night' ? next : 'system'
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
  const theme = useSyncExternalStore(subscribe, read, () => 'system')
  const dark = useSyncExternalStore(subscribeSystem, systemIsDark, () => false)
  const resolved = theme === 'system' ? (dark ? 'night' : 'day') : theme
  return [theme, setTheme, resolved]
}
