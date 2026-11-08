// The whole mock seed. api.js loads this with a dynamic import, so seed data (and the demo
// passwords) live in their own chunk rather than the main bundle.
import { courses } from './courses'
import { buildListings } from './listings'
import { buildOffers } from './offers'
import { users } from './users'

/** Fresh copies of every seed table. Dates are relative to `now`. */
export function buildSeed({ now = Date.now() } = {}) {
  return structuredClone({
    courses,
    users,
    listings: buildListings(now),
    offers: buildOffers(now),
  })
}
