// Shared user reads: the A6 User (public) and User (self) shapes. The password hash is never
// selected here, so it cannot leak into a response by accident.

export const USER_COLUMNS =
  'u.id, u.name, u.email, u.year_of_study, u.usual_pickup_spot, u.created_at'

const iso = (d) => (d instanceof Date ? d.toISOString() : d)

/** What anyone may see about a user: never the email or any password information. */
export function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    memberSince: iso(row.created_at),
    yearOfStudy: row.year_of_study ?? null,
    usualPickupSpot: row.usual_pickup_spot ?? null,
  }
}

/** The signed-in user's own record: the public shape plus their email. */
export function toSelfUser(row) {
  return { ...toPublicUser(row), email: row.email }
}
