import rateLimit from 'express-rate-limit'
import { HttpError, MESSAGES } from '../lib/errors.js'

const FIFTEEN_MINUTES = 15 * 60 * 1000

/**
 * Per-client attempt limiter for sign-in forms. Answers 429 in the A4 format once a client
 * (by IP; `trust proxy` makes that the real client behind the host's proxy) goes over
 * `limit` counted requests in 15 minutes.
 */
export function attemptLimiter({ limit, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit,
    skipSuccessfulRequests,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new HttpError(429, MESSAGES.tooMany)),
  })
}
