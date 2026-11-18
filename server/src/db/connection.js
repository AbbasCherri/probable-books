import 'dotenv/config'

/**
 * Read a connection string from the environment and make TLS verification explicit.
 * pg warns that sslmode=require/prefer/verify-ca will change meaning, so we pin it to
 * verify-full (the certificate and host name are always checked, never disabled).
 */
export function connectionString(name) {
  const raw = process.env[name]
  if (!raw) throw new Error(`${name} is not set (see server/.env.example)`)
  const url = new URL(raw)
  const mode = url.searchParams.get('sslmode')
  if (mode && ['require', 'prefer', 'verify-ca'].includes(mode)) {
    url.searchParams.set('sslmode', 'verify-full')
  }
  return url.toString()
}
