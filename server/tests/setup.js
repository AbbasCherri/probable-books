// Loads server/.env when present. Tests that need real data run only when DATABASE_URL is
// set; otherwise a placeholder lets the app load (the pool connects lazily, never here).
import 'dotenv/config'

process.env.NODE_ENV = 'test'
process.env.TEST_HAS_DB = process.env.DATABASE_URL ? '1' : ''
process.env.DATABASE_URL ??= 'postgres://user:pass@127.0.0.1:1/none'
