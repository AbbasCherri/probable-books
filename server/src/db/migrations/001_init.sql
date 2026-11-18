-- =====================================================================================
-- Probable Books: initial schema (migration 001)
-- Target: PostgreSQL 15+ (Neon default is 16 or 17).
--
-- How to run
--   * Use Neon's DIRECT connection string (host WITHOUT "-pooler") for migrations.
--   * The migration runner should wrap this file in one transaction. This file therefore
--     contains no BEGIN / COMMIT of its own.
--   * Never edit this file after it has been merged. Add 002_*.sql instead.
--
-- Conventions
--   * Ids are text with a prefix (usr_, lst_, off_) and a database-generated default, so
--     seed data can keep readable ids (usr_demo, lst_001) and new rows get a uuid suffix.
--   * Money is integer cents. Times are timestamptz (UTC on the wire).
--   * The API maps snake_case columns to the camelCase shapes in the requirements document.
--   * Drafts may be incomplete; every other status must be complete (see listings).
-- =====================================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- fast substring search on listings (Browse "q")

-- ---------- enumerations --------------------------------------------------------------
CREATE TYPE listing_category  AS ENUM ('textbook', 'calculator', 'lab_gear', 'other');
-- Declared best to worst, so ORDER BY condition is the "best condition first" sort.
CREATE TYPE listing_condition AS ENUM ('new', 'like_new', 'good', 'fair', 'worn');
CREATE TYPE listing_status    AS ENUM ('draft', 'active', 'reserved', 'sold');
CREATE TYPE offer_status      AS ENUM ('pending', 'accepted', 'declined', 'countered', 'withdrawn');

-- ---------- domains (reusable validated types) ----------------------------------------
CREATE DOMAIN pickup_spot AS text
  CHECK (VALUE IN ('Science building lobby', 'Main library entrance',
                   'Student union café', 'Engineering quad', 'Bookstore steps'));

-- Stored in the spaced, upper-case form: CHEM 201. The API normalises input before saving.
CREATE DOMAIN course_code AS text
  CHECK (VALUE ~ '^[A-Z]{2,4} [0-9]{3}$');

-- ---------- helper functions ----------------------------------------------------------
CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Longest string in a text[]; lets a CHECK constrain every element's length.
CREATE FUNCTION text_array_max_length(items text[]) RETURNS integer
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT COALESCE(max(char_length(item)), 0) FROM unnest(items) AS item
$$;

-- =====================================================================================
-- users
-- =====================================================================================
CREATE TABLE users (
  id                text PRIMARY KEY DEFAULT ('usr_' || gen_random_uuid()),
  name              text NOT NULL CHECK (btrim(name) <> ''),
  email             text NOT NULL CHECK (email ~ '^[^[:space:]@]+@[^[:space:]@]+$'),
  password_hash     text NOT NULL,                       -- bcrypt hash, never the password
  year_of_study     smallint CHECK (year_of_study BETWEEN 1 AND 8),
  usual_pickup_spot pickup_spot,
  created_at        timestamptz NOT NULL DEFAULT now(),  -- API: memberSince
  updated_at        timestamptz NOT NULL DEFAULT now()
);
-- One account per email, ignoring capitalisation. The API also lower-cases before saving.
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================================
-- courses (seeded, read-only through the API)
-- =====================================================================================
CREATE TABLE courses (
  code               course_code PRIMARY KEY,
  department         text NOT NULL GENERATED ALWAYS AS (split_part(code, ' ', 1)) STORED,
  number             text NOT NULL GENERATED ALWAYS AS (split_part(code, ' ', 2)) STORED,
  title              text NOT NULL CHECK (btrim(title) <> ''),
  -- [{ "id": "chem201-text", "label": "...", "category": "textbook", "keywords": ["organic"] }]
  required_materials jsonb  NOT NULL DEFAULT '[]'::jsonb
                     CHECK (jsonb_typeof(required_materials) = 'array'),
  tips               text[] NOT NULL DEFAULT '{}',
  related_codes      text[] NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX courses_department_idx ON courses (department);

-- =====================================================================================
-- listings
-- =====================================================================================
CREATE TABLE listings (
  id              text PRIMARY KEY DEFAULT ('lst_' || gen_random_uuid()),
  seller_id       text NOT NULL REFERENCES users (id) ON DELETE CASCADE,

  -- Nullable only so that drafts can be incomplete (see listings_complete_unless_draft).
  title           text,
  category        listing_category,
  condition       listing_condition,
  price_cents     integer,
  pickup_spot     pickup_spot,

  author          text,
  edition         text,
  isbn            text,                         -- digits only; check digit verified by the API
  brand           text,
  model           text,
  condition_notes text[]  NOT NULL DEFAULT '{}',
  description     text    NOT NULL DEFAULT '',
  retail_cents    integer,
  open_to_offers  boolean NOT NULL DEFAULT true,
  status          listing_status NOT NULL DEFAULT 'active',
  featured        boolean NOT NULL DEFAULT false,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Substring search across title, author, isbn, brand, model. The separator (unit
  -- separator character) stops a query from matching across two fields.
  search_text     text GENERATED ALWAYS AS (
                    lower(COALESCE(title, '')  || E'\x1f' || COALESCE(author, '') || E'\x1f' ||
                          COALESCE(isbn, '')   || E'\x1f' || COALESCE(brand, '')  || E'\x1f' ||
                          COALESCE(model, ''))
                  ) STORED,

  -- Anything that is filled in must be valid, even in a draft.
  CONSTRAINT listings_title_length    CHECK (char_length(btrim(title)) BETWEEN 5 AND 120),
  CONSTRAINT listings_price_range     CHECK (price_cents BETWEEN 1 AND 500000),
  CONSTRAINT listings_retail_positive CHECK (retail_cents > 0),
  CONSTRAINT listings_retail_above_price
    CHECK (retail_cents IS NULL OR price_cents IS NULL OR retail_cents > price_cents),
  CONSTRAINT listings_isbn_shape      CHECK (isbn ~ '^([0-9]{9}[0-9X]|[0-9]{13})$'),
  CONSTRAINT listings_notes_count     CHECK (cardinality(condition_notes) <= 5),
  CONSTRAINT listings_notes_length    CHECK (text_array_max_length(condition_notes) <= 80),
  CONSTRAINT listings_description_len CHECK (char_length(description) <= 1000),

  -- Every status except draft needs the core fields.
  CONSTRAINT listings_complete_unless_draft
    CHECK (status = 'draft'
           OR (title IS NOT NULL AND category IS NOT NULL AND condition IS NOT NULL
               AND price_cents IS NOT NULL AND pickup_spot IS NOT NULL))
);

CREATE TRIGGER listings_set_updated_at BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Browse and "new" shelf: newest first among visible (non-draft) listings.
CREATE INDEX listings_visible_created_idx ON listings (created_at DESC, id DESC)
  WHERE status <> 'draft';
-- Home "Fresh this week" shelf and course counts: active only.
CREATE INDEX listings_active_created_idx ON listings (created_at DESC)
  WHERE status = 'active';
-- Home featured spread.
CREATE INDEX listings_featured_idx ON listings (created_at DESC)
  WHERE featured AND status = 'active';
-- "My listings" and the seller's activeListingCount.
CREATE INDEX listings_seller_status_idx ON listings (seller_id, status);
-- Browse keyword search.
CREATE INDEX listings_search_trgm_idx ON listings USING gin (search_text gin_trgm_ops);

-- ---------- listing <-> courses (many to many, ordered, at most 5) --------------------
CREATE TABLE listing_courses (
  listing_id  text        NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  position    smallint    NOT NULL CHECK (position BETWEEN 0 AND 4),   -- max 5 courses
  course_code course_code NOT NULL REFERENCES courses (code) ON UPDATE CASCADE,
  PRIMARY KEY (listing_id, position),
  UNIQUE (listing_id, course_code)                                      -- no duplicates
);
CREATE INDEX listing_courses_course_idx ON listing_courses (course_code);

-- ---------- listing photos (ordered, at most 6; position 0 is the cover) --------------
CREATE TABLE listing_photos (
  listing_id text     NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  position   smallint NOT NULL CHECK (position BETWEEN 0 AND 5),        -- max 6 photos
  -- Absolute http(s) address (uploaded photos) or a site-relative path such as /mock/cover.svg
  -- (seed photos served by the frontend). Blocks javascript:, data: and protocol-relative //.
  url        text     NOT NULL CHECK (url ~ '^(https?://|/[^/])'),
  alt        text     NOT NULL DEFAULT '',
  PRIMARY KEY (listing_id, position)
);

-- =====================================================================================
-- offers
-- =====================================================================================
CREATE TABLE offers (
  id            text PRIMARY KEY DEFAULT ('off_' || gen_random_uuid()),
  listing_id    text NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  buyer_id      text NOT NULL REFERENCES users (id)    ON DELETE CASCADE,
  amount_cents  integer NOT NULL CHECK (amount_cents > 0),
  message       text    NOT NULL DEFAULT '' CHECK (char_length(message) <= 280),
  status        offer_status NOT NULL DEFAULT 'pending',
  counter_cents integer,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  -- A counter is always higher than the offer, and a countered offer must carry one.
  -- (Accepted, declined and withdrawn offers keep it as history.)
  CONSTRAINT offers_counter_above_amount CHECK (counter_cents IS NULL OR counter_cents > amount_cents),
  CONSTRAINT offers_countered_has_counter CHECK (status <> 'countered' OR counter_cents IS NOT NULL)
);

CREATE TRIGGER offers_set_updated_at BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A buyer has at most one waiting offer per listing, even if two requests arrive together.
CREATE UNIQUE INDEX offers_one_pending_per_buyer ON offers (listing_id, buyer_id)
  WHERE status = 'pending';
CREATE INDEX offers_listing_idx       ON offers (listing_id, created_at DESC);
CREATE INDEX offers_buyer_idx         ON offers (buyer_id, created_at DESC);
CREATE INDEX offers_listing_pending_idx ON offers (listing_id) WHERE status = 'pending';

-- =====================================================================================
-- Documentation visible in psql (\d+ table) and in Neon's table viewer
-- =====================================================================================
COMMENT ON TABLE users          IS 'Student accounts. password_hash is a bcrypt hash.';
COMMENT ON TABLE courses        IS 'Course index. Seeded; read-only through the API.';
COMMENT ON TABLE listings       IS 'Items for sale. Drafts may be incomplete; all other statuses must be complete.';
COMMENT ON TABLE listing_courses IS 'Courses a listing is tagged with, in display order (max 5).';
COMMENT ON TABLE listing_photos IS 'Photos of a listing in display order (max 6). Position 0 is the cover.';
COMMENT ON TABLE offers         IS 'Buyer offers on listings. Accepting one reserves the listing (done in one transaction by the API).';
COMMENT ON COLUMN listings.search_text IS 'Generated lower-case search string. Query with: search_text LIKE ''%'' || lower(escaped_q) || ''%''.';
