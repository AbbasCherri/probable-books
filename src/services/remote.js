// The real backend. Same function signatures as the mock (./mock/mockApi.js), so pages do not
// care which one they get; every rule (validation, ownership, offers) is decided by the server.
import { ApiError } from './errors'
import { clearToken, getToken, request, setToken } from './http'

export { ApiError }

// ---------- listings ----------
/** Browse: filters use the page's names; the API's query names are mapped here. */
export function getListings(filters = {}) {
  return request('GET', '/listings', {
    query: {
      q: filters.q?.trim(),
      course: filters.courses,
      category: filters.categories,
      condition: filters.conditions,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      openToOffers: filters.openToOffers ? 'true' : undefined,
      sort: filters.sort,
      page: filters.page,
      pageSize: filters.pageSize,
    },
  })
}

export const getFeaturedListings = () => request('GET', '/listings/featured')
export const getNewListings = (limit = 10) =>
  request('GET', '/listings/new', { query: { limit } })
export const getListing = (id) => request('GET', `/listings/${encodeURIComponent(id)}`)
export const createListing = (data) => request('POST', '/listings', { body: data })
export const updateListing = (id, data) =>
  request('PATCH', `/listings/${encodeURIComponent(id)}`, { body: data })
export const deleteListing = (id) =>
  request('DELETE', `/listings/${encodeURIComponent(id)}`).then(() => undefined)
export const getMyListings = () => request('GET', '/listings/mine')

// ---------- courses ----------
// The header lookup asks for the index every time it opens; the server allows answers up to
// 60 seconds old, so a successful answer is reused for that long. Failures are never kept.
const COURSES_TTL_MS = 60_000
let coursesCache = null // { at, promise }

export function getCourses() {
  if (coursesCache && Date.now() - coursesCache.at < COURSES_TTL_MS) {
    return coursesCache.promise.then((list) => structuredClone(list))
  }
  const promise = request('GET', '/courses')
  coursesCache = { at: Date.now(), promise }
  promise.catch(() => {
    if (coursesCache?.promise === promise) coursesCache = null
  })
  return promise.then((list) => structuredClone(list))
}

export const getCourse = (code) => request('GET', `/courses/${encodeURIComponent(code)}`)

// ---------- offers ----------
export const makeOffer = (listingId, { amountCents, message = '' } = {}) =>
  request('POST', `/listings/${encodeURIComponent(listingId)}/offers`, {
    body: { amountCents, message },
  })
export const getOffers = ({ direction = 'received' } = {}) =>
  request('GET', '/offers', { query: { direction } })
export const respondToOffer = (id, action, counterCents) =>
  request('PATCH', `/offers/${encodeURIComponent(id)}`, {
    body: counterCents === undefined ? { action } : { action, counterCents },
  })

// ---------- auth ----------
/** Signs in and keeps the token for later requests. Resolves with the user. */
export async function login(email, password) {
  const { user, token } = await request('POST', '/auth/login', {
    body: { email, password },
  })
  setToken(token)
  return user
}

export async function register({ name, email, password, yearOfStudy } = {}) {
  const { user, token } = await request('POST', '/auth/register', {
    body: { name, email, password, yearOfStudy: yearOfStudy ?? null },
  })
  setToken(token)
  return user
}

/** Always signs out locally, even if the server cannot be reached. */
export async function logout() {
  try {
    await request('POST', '/auth/logout')
  } catch {
    /* the token is discarded either way */
  } finally {
    clearToken()
  }
}

/** The signed-in user, or null (no token, or the server no longer accepts it). */
export async function getCurrentUser() {
  if (!getToken()) return null
  try {
    return await request('GET', '/auth/me')
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null // token already cleared
    throw err
  }
}

// ---------- uploads ----------
/** Uploads one photo before the listing is saved. Resolves with { url }. */
export function uploadPhoto(file) {
  const form = new FormData()
  form.append('photo', file)
  return request('POST', '/uploads', { form })
}
