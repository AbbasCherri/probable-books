# Probable Books server

## Prerequisites

- Node.js 22 or newer
- A PostgreSQL 16 database: a Neon branch (see `docs/NEON_SETUP.md`), or Docker for the local
  one in `docker-compose.yml`

## Local setup

```
cp .env.example .env    # fill in DATABASE_URL and DIRECT_URL (Docker: postgres://postgres:postgres@localhost:5432/probable_books for both)
npm install
npm run migrate         # creates the schema
npm run seed:reset      # loads the demo data (demo@probable.books / password123)
npm run dev             # http://localhost:4000
```

The API listens on the `PORT` from `.env` (4000 by default). Check it with
`curl localhost:4000/api/health` and open the interactive docs at <http://localhost:4000/api/docs>.

| Variable         | Purpose                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `CORS_ORIGIN`    | Comma-separated web app origins allowed to call the API. Default: `http://localhost:5173` |
| `JWT_SECRET`     | Signs sign-in tokens                                                                      |
| `JWT_EXPIRES_IN` | Token lifetime (`7d`)                                                                     |

## Platform conventions (for every route file)

- Throw `HttpError(status, message, { fields, closest })` from `src/lib/errors.js`, or
  `validationError(fields)` for a 422 form error. The shared handler turns it into the A4 body.
  Anything else becomes a 500 with no detail. Unknown routes and malformed JSON are handled.
- Express 5 forwards rejected promises, so async handlers need no try/catch.
- Read listings with `LISTING_COLUMNS` and `toListing` from `src/lib/listings.js` so every
  endpoint returns the same A6 shape. `normalizeCourseCode` is in `src/lib/courseCodes.js`.
- Document each endpoint with an `@openapi` JSDoc block above the route (see
  `src/routes/listings.browse.js`). Shared schemas (`Listing`, `Offer`, `User`, `Error`, ...)
  and responses (`Unauthorized`, `NotFound`, `Unprocessable`, ...) are in `src/docs/openapi.js`;
  reference them with `$ref: '#/components/schemas/Listing'`. Required endpoints add
  `security: [{ bearerAuth: [] }]`.
- Every request is logged as `METHOD path status time`. Bodies and headers are never logged.

## Tests

```
npm test              # Vitest + supertest; database tests run when DATABASE_URL is set
npm run test:schema   # checks the migration in an in-process Postgres
```

Database tests only read the seeded data, so they are safe on the shared dev branch.

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
npm run migrate       # applies new migrations, skips applied ones, fails if an applied file changed
npm run seed:reset    # TRUNCATEs all six tables and reloads the demo data from the frontend mock
npm run seed          # same, but refuses if the users table already has rows
```

`npm run migrate:down:dev -- --i-know-this-wipes-data` drops the schema (refused when `NODE_ENV=production`).
`seed:reset` in production also needs `--yes-wipe-production`.

**Never edit a merged migration.** Add `002_*.sql` instead. The runner stores a checksum for each applied file
and refuses to continue if one changes.

Free tiers have no backups, so `npm run seed:reset` is how to rebuild the demo data (all demo passwords are `password123`).

`GET /api/health` runs `select 1` through the pool and returns `{ "status": "ok" }`, or a 500 in the
standard error format when the database is unreachable.
