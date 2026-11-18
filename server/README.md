# Probable Books server

## Prerequisites

- Node.js 22 or newer
- Docker (for the local PostgreSQL 16 database)

## Local setup

```
docker compose up -d
cp .env.example .env
npm install
npm run dev
```

The API listens on the `PORT` from `.env` (4000 by default).

## Who owns what

One file per owner, so pull requests rarely collide.

| File                            | Owner   | Endpoints                                                    |
| ------------------------------- | ------- | ------------------------------------------------------------ |
| `src/routes/listings.browse.js` | Abbas   | GET /listings, /listings/featured, /listings/new             |
| `src/routes/listings.detail.js` | Wazan   | GET /listings/:id                                            |
| `src/routes/courses.js`         | Wazan   | GET /courses, /courses/:code                                 |
| `src/routes/offers.create.js`   | Wazan   | POST /listings/:id/offers, GET /offers                       |
| `src/routes/listings.write.js`  | Youssef | POST/PATCH/DELETE /listings, GET /listings/mine              |
| `src/routes/offers.respond.js`  | Youssef | PATCH /offers/:id                                            |
| `src/routes/auth.js`            | Ayk     | POST /auth/register, /auth/login, /auth/logout, GET /auth/me |
| `src/routes/users.js`           | Ayk     | GET /users/:id, PATCH and DELETE /users/me                   |
| `src/routes/uploads.js`         | Ayk     | POST /uploads                                                |
| `src/middleware/auth.js`        | Ayk     | JWT middleware                                               |
| `src/lib/`, `src/db/`           | Abbas   | Shared code and migrations (two approvals)                   |

## Database

PostgreSQL 16, hosted on Neon. The schema lives in `src/db/migrations/` (see `docs/NEON_SETUP.md`).

Two connection strings, both in `.env` (never committed):

| Variable       | Neon string                      | Used by                  |
| -------------- | -------------------------------- | ------------------------ |
| `DATABASE_URL` | pooled (host contains `-pooler`) | the running API (`pool`) |
| `DIRECT_URL`   | direct (no `-pooler`)            | `migrate` and `seed`     |

```
npm run test:schema   # checks the migration in an in-process Postgres (expects 63 passed, 0 failed)
npm run migrate       # applies new migrations, skips applied ones, fails if an applied file changed
npm run seed:reset    # TRUNCATEs all six tables and reloads the demo data from the frontend mock
npm run seed          # same, but refuses if the users table already has rows
```

`npm run migrate:down:dev -- --i-know-this-wipes-data` drops the schema (refused when `NODE_ENV=production`).
`seed:reset` in production also needs `--yes-wipe-production`.

**Never edit a merged migration.** Add `002_*.sql` instead. The runner stores a checksum for each applied file
and refuses to continue if one changes.

Free tiers have no backups, so `npm run seed:reset` is how to rebuild the demo data (all demo passwords are `password123`).

`GET /api/health` runs `select 1` through the pool and returns `{ "status": "ok", "db": "up" }`.
