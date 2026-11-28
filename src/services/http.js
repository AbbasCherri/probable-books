// The one place the app talks to the API. Sends the stored token, parses JSON, and turns
// every failure (A4 body) into an ApiError carrying status, message, fields and closest.
import { ApiError } from './errors'

// Empty in development: Vite proxies /api to the local server (vite.config.js). Set it to the
// deployed API's address for production builds, e.g. https://probable-books-api.example.
export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

export const TOKEN_KEY = 'pb.token'
export const SIGNED_OUT_EVENT = 'pb:signed-out'

// Where the sign-in token lives. Normally localStorage, so you stay signed in across tabs and
// restarts. A build with VITE_TOKEN_STORAGE=session (the dev site, for parallel QA) keeps it in
// sessionStorage instead: every tab then signs in on its own and tabs never swap identities.
const useSession = () => import.meta.env.VITE_TOKEN_STORAGE === 'session'
const tokenStore = () => (useSession() ? window.sessionStorage : window.localStorage)

export const getToken = () => {
  try {
    return tokenStore().getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
export const setToken = (token) => {
  try {
    tokenStore().setItem(TOKEN_KEY, token)
  } catch {
    /* storage blocked: the user stays signed out */
  }
}
export const clearToken = () => {
  try {
    tokenStore().removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

const OFFLINE = "We couldn't reach the server. Check your connection and try again."
const UNEXPECTED = 'Something went wrong. Try again.'

/**
 * request('GET', '/listings', { query, body, form })
 *   query: object; arrays become repeated params; null/undefined/''/false are left out
 *   body:  JSON body
 *   form:  FormData (multipart), e.g. a photo upload
 * Resolves with the parsed JSON (null for 204). Rejects with ApiError.
 */
export async function request(method, path, { query, body, form } = {}) {
  const url = new URL(`${API_URL}/api${path}`, window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    for (const item of [].concat(value)) {
      if (item === undefined || item === null || item === '' || item === false) continue
      url.searchParams.append(key, String(item))
    }
  }
  const headers = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let payload
  if (form) payload = form
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(url, { method, headers, body: payload })
  } catch {
    throw new ApiError(0, OFFLINE)
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (res.ok) return data

  // A stored token the server no longer accepts (expired, account deleted): sign out.
  if (res.status === 401 && token) {
    clearToken()
    window.dispatchEvent(new Event(SIGNED_OUT_EVENT))
  }
  throw new ApiError(res.status, data?.message ?? UNEXPECTED, data?.fields, data?.closest)
}
