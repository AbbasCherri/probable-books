// localStorage behind try/catch: it can throw (private mode, blocked data).
export function readJSON(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

/** The raw string stored under key, or null. */
export function readString(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeKey(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
