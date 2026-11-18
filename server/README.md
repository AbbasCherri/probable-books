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
