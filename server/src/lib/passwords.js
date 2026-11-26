// Password hashing (requirements A2): only bcrypt hashes are stored, never the password.
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'

// Same cost as the seed script, so seeded and new accounts take the same time to check.
const COST = 10
export const MIN_PASSWORD = 8

export const hashPassword = (password) => bcrypt.hash(password, COST)

// Compared against when the email is unknown, so a wrong email takes as long as a wrong
// password and the two cannot be told apart by timing.
const dummyHash = bcrypt.hash(randomBytes(16).toString('hex'), COST)

/** True when `password` matches `hash`. With no hash, does the same work and returns false. */
export async function checkPassword(password, hash) {
  const ok = await bcrypt.compare(
    typeof password === 'string' ? password : '',
    hash ?? (await dummyHash),
  )
  return Boolean(hash) && ok
}
