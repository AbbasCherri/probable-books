// The only module pages talk to. In the app it is the real backend (./remote.js). Unit tests
// and the UI e2e suite set VITE_API_MOCK=1 to get the in-memory stand-in instead
// (./mock/mockApi.js); that flag is fixed at build time, so the mock never ships in the app.
import { ApiError } from './errors'

export { ApiError }

const USE_MOCK = import.meta.env.VITE_API_MOCK === '1'

let impl = null
const load = () =>
  (impl ??= USE_MOCK ? import('./mock/mockApi') : import('./remote')).catch((err) => {
    impl = null
    throw err
  })
const call =
  (name) =>
  (...args) =>
    load().then((m) => m[name](...args))

export const getListings = call('getListings')
export const getFeaturedListings = call('getFeaturedListings')
export const getNewListings = call('getNewListings')
export const getListing = call('getListing')
export const createListing = call('createListing')
export const updateListing = call('updateListing')
export const deleteListing = call('deleteListing')
export const getMyListings = call('getMyListings')
export const getCourses = call('getCourses')
export const getCourse = call('getCourse')
export const makeOffer = call('makeOffer')
export const getOffers = call('getOffers')
export const respondToOffer = call('respondToOffer')
export const login = call('login')
export const register = call('register')
export const logout = call('logout')
export const getCurrentUser = call('getCurrentUser')
export const uploadPhoto = call('uploadPhoto')

/** Mock only (dev tools and tests): throw away every change and restore the seed. */
export const resetDemoData = USE_MOCK
  ? call('resetDemoData')
  : () =>
      Promise.reject(
        new ApiError(400, 'Demo data lives on the server: run npm run seed:reset.'),
      )
