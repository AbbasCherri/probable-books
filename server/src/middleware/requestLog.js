import morgan from 'morgan'

// One line per request: method, path, result and time taken. Never logs bodies or headers,
// so passwords and tokens cannot end up in the log. Silent under tests.
export const requestLog = morgan(':method :url :status :response-time ms', {
  skip: () => process.env.NODE_ENV === 'test',
})
