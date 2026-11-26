import cors from 'cors'

// Browsers may call the API from the deployed web app and the local dev app.
// CORS_ORIGIN is a comma-separated list, e.g. "https://probable-books.example,http://localhost:5173".
const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

export function allowedOrigins(env = process.env.CORS_ORIGIN) {
  const list = (env ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean)
  return list.length ? list : DEV_ORIGINS
}

export const corsMiddleware = cors({
  origin: allowedOrigins(),
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
})
