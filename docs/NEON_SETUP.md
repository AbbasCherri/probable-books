# Probable Books: database setup on Neon

Schema version: migration `001_init`. Tested on an in-process PostgreSQL (63 rule checks), and the
full prototype seed (8 users, 15 courses, 140 listings, 204 course tags, 110 photos, 31 offers)
loads into it without a single rejected row.

## Files

| File                | Where it goes in the repo   | Purpose                                                                                                                                                                            |
| ------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `001_init.sql`      | `server/src/db/migrations/` | Creates everything                                                                                                                                                                 |
| `001_init.down.sql` | `server/src/db/migrations/` | Drops everything (dev and test only)                                                                                                                                               |
| `schema.check.mjs`  | `server/tests/`             | 63 checks of every constraint, trigger and cascade. Add `@electric-sql/pglite` as a dev dependency and a script `"test:schema": "node tests/schema.check.mjs"`. Needs no database. |

The migration runner must run each file in one transaction (the file has no BEGIN or COMMIT) and
skip files it has already applied (track them in its own `schema_migrations` table). The `*.down.sql`
files are never run automatically.

## Launch on Neon (Abbas, about 15 minutes)

1. Create a Neon project. Pick the region closest to the Render region you will use for the web service, so the two are in the same area.
2. Open **Connect** and copy two connection strings from the same project:
   - **Pooled** (host contains `-pooler`): for the running API.
   - **Direct** (no `-pooler`): for migrations and seeding.
3. In Render, set `DATABASE_URL` to the pooled string and `DIRECT_URL` to the direct string. Both already end in `sslmode=require`; keep it.
4. Locally, set both in `server/.env` (use a separate Neon branch or a docker Postgres for development, not the live database).
5. Run the migration with `DIRECT_URL`, then the seed script with `DIRECT_URL`.
6. Render's deploy command for migrations must also use `DIRECT_URL`.
7. Verify in Neon's SQL editor:

```sql
select count(*) from courses;                                   -- 15
select status, count(*) from listings group by 1 order by 1;    -- draft 2, active 118, reserved 12, sold 8
select count(*) from offers;                                    -- 31
```

Why two strings: Neon's pooler runs in transaction mode, which does not support session-level
features such as `SET`, `LISTEN`/`NOTIFY` or session advisory locks. Migration tools use those, so
they need the direct string. Normal queries and transactions work fine on the pooled one.

## How the API should connect

- Use one `pg` `Pool` with a small `max` (5 is plenty for a free tier).
- Neon suspends an idle database after about 5 minutes. The first query afterwards takes a moment longer, so set the pool's `connectionTimeoutMillis` to about 10000 instead of leaving it very short.
- Do each multi-step change (accept an offer, create a listing with its courses and photos) on one client from `pool.connect()` inside `BEGIN ... COMMIT`. Do not spread a transaction across `pool.query` calls.
- Accepting an offer, in order: `BEGIN`; `SELECT status FROM listings WHERE id = $1 FOR UPDATE`; check it is `active`; update the offer; update the listing to `reserved`; `COMMIT`. The row lock is what makes two simultaneous accepts end with one winner.

## What the database enforces, and what the API must still enforce

| The database guarantees                                                                                      | The API must still check                                                                     |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| One account per email, ignoring case                                                                         | Normalising email (trim, lower-case) and password length of at least 8                       |
| Title 5 to 120 characters, price 1 to 500,000 cents, retail above price                                      | The exact error messages from the requirements document                                      |
| Every non-draft listing has title, category, condition, price and pickup spot                                | At least 1 course on every non-draft listing (courses live in another table)                 |
| At most 5 courses and 6 photos per listing, in order, no duplicate course                                    | ISBN check digit (the database only checks the 10 or 13 digit shape)                         |
| Course codes exist and have the form `CHEM 201`                                                              | Normalising codes before saving (`chem201` becomes `CHEM 201`)                               |
| Condition notes: at most 5, each at most 80 characters                                                       | Status changes that make sense (for example a draft must be complete before it is published) |
| Offer amount above 0, message at most 280 characters                                                         | Offer at most the asking price; counter below the asking price                               |
| A counter is above the offer, and a countered offer always has one                                           | A buyer cannot offer on their own listing; the listing must be active and open to offers     |
| One pending offer per buyer per listing, even under a race                                                   | The offer action table (who may accept, decline, counter, withdraw)                          |
| Deleting a listing deletes its offers, courses and photos; deleting a user deletes their listings and offers | Listing is `reserved` in the same transaction as the accepted offer                          |
| Courses cannot be deleted while listings use them                                                            | Search input: escape `%` and `_` before using it in a `LIKE`                                 |

## Mapping from API and seed fields to columns

| API or seed field                                          | Stored as                                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `memberSince`                                              | `users.created_at`                                                                 |
| `password` (seed)                                          | `users.password_hash`, a bcrypt hash                                               |
| `courseCodes` (array)                                      | one `listing_courses` row per code; `position` is the array index                  |
| `photos` (array of `{url, alt}`)                           | one `listing_photos` row per photo; `position` is the array index, 0 is the cover  |
| `conditionNotes`                                           | `listings.condition_notes` (text array)                                            |
| `requiredMaterials`                                        | `courses.required_materials` (JSON); `tips` and `relatedCodes` are text arrays     |
| `priceCents`, `retailCents`, `amountCents`, `counterCents` | integer columns of the same meaning                                                |
| `createdAt`, `updatedAt`                                   | `created_at`, `updated_at` (`updated_at` also moves automatically on every update) |

Seed insert order: `users`, `courses`, `listings`, `listing_courses`, `listing_photos`, `offers`.
Seed ids (`usr_demo`, `lst_001`, `off_001`) are kept as they are; new rows get `usr_`, `lst_`, `off_` plus a uuid.
Seed photos are site-relative paths such as `/mock/cover-notebook.svg`. The schema allows them, so keep
`public/mock/` in the frontend. Uploaded photos will be full `https://` addresses.

## Browse queries the schema is built for

- **Newest first, no drafts:** `WHERE status <> 'draft' ORDER BY created_at DESC, id DESC`
- **Best condition first:** `ORDER BY condition, created_at DESC, id` (the enum is declared best to worst)
- **Keyword:** `WHERE search_text LIKE '%' || lower($1) || '%'` (covers title, author, isbn, brand, model)
- **Course filter:** join `listing_courses` and filter `course_code = ANY($1)`
- **Course median price:** `percentile_cont(0.5) WITHIN GROUP (ORDER BY price_cents)` over active listings
- **Seller's active count and a listing's pending offer count:** both have indexes

## Known limits and open decisions

- **Relisting after a sale in progress.** If a seller moves a `reserved` listing back to `active`, the old accepted offer stays `accepted` as history. The schema allows a later second accepted offer, because blocking it would break relisting. Decide whether relisting should also mark the old offer `withdrawn`.
- **Year of study** accepts 1 to 8; the Register form offers 1 to 4. The requirements document does not restrict it.
- **No backups on free tiers.** Keep `server/src/db/seed/` reproducible so the live database can be rebuilt in minutes: run the down migration, the up migration, then the seed.
- **Free-plan usage.** Neon's free plan has a monthly compute allowance, so keep automated pings away from the database.
