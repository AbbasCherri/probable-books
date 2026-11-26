export class ApiError extends Error {
  /**
   * status: HTTP status (0 when the server could not be reached).
   * fields: optional { fieldName: message } for 422s, so forms can mark each input.
   * closest: optional course codes, for an unknown course.
   */
  constructor(status, message, fields, closest) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    if (fields) this.fields = fields
    if (closest) this.closest = closest
  }
}
