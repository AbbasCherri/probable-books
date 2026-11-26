// Shared error format (requirements A4). Every failure, on every endpoint, answers with
//   { message, fields?, closest? }
// Route code throws an HttpError (or calls next(err)); errorHandler turns it into JSON.

export const MESSAGES = {
  badJson: 'That request could not be read.',
  signIn: 'Sign in to continue.',
  tornOut: 'This page was torn out.',
  notFound: 'Not found.',
  tooMany: 'Too many attempts. Wait a few minutes and try again.',
  unexpected: 'Something went wrong. Try again.',
}

export class HttpError extends Error {
  /**
   * @param {number} status HTTP status
   * @param {string} message shown to the user as written
   * @param {{ fields?: Record<string,string>, closest?: string[] }} [extra]
   */
  constructor(status, message, { fields, closest } = {}) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    if (fields) this.fields = fields
    if (closest) this.closest = closest
  }
}

/**
 * 422 for a form. `fields` maps field name to message; the top-level message is the field
 * messages joined by a space, as A4 requires.
 */
export function validationError(fields) {
  return new HttpError(422, Object.values(fields).join(' '), { fields })
}

export const unauthorized = () => new HttpError(401, MESSAGES.signIn)
export const tornOut = () => new HttpError(404, MESSAGES.tornOut)

/** Catch-all for paths no router answered (mounted after every router). */
export function notFoundRoute(_req, _res, next) {
  next(new HttpError(404, MESSAGES.notFound))
}

/**
 * Last middleware. Known HttpErrors keep their status and message. Body-parser failures
 * (malformed JSON, body too large) become 400. Anything else is logged and becomes a 500
 * with no technical detail.
 */
export function errorHandler(err, req, res, _next) {
  let body
  let status
  if (err instanceof HttpError) {
    status = err.status
    body = { message: err.message }
    if (err.fields) body.fields = err.fields
    if (err.closest) body.closest = err.closest
  } else if (typeof err?.type === 'string' && err.type.startsWith('entity.')) {
    // Thrown by express.json(): entity.parse.failed, entity.too.large, ...
    status = 400
    body = { message: MESSAGES.badJson }
  } else {
    status = 500
    body = { message: MESSAGES.unexpected }
    // Log the cause for us, never for the client. Only method and path: bodies may hold passwords.
    console.error(`500 ${req.method} ${req.originalUrl}:`, err?.stack ?? err)
  }
  if (res.headersSent) return res.end()
  res.status(status).json(body)
}
