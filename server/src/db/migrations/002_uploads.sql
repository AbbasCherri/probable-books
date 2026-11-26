-- =====================================================================================
-- Probable Books: listing photo uploads (migration 002)
-- Photos are stored in the database and served by the API at /api/uploads/:id, so their
-- addresses keep working permanently on any host, with no third-party storage account.
-- =====================================================================================

CREATE TABLE uploads (
  id           text PRIMARY KEY DEFAULT ('upl_' || replace(gen_random_uuid()::text, '-', '')),
  -- Kept when the uploader deletes their account: a photo address must never break.
  owner_id     text REFERENCES users (id) ON DELETE SET NULL,
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  byte_size    integer NOT NULL CHECK (byte_size BETWEEN 1 AND 5242880),   -- at most 5 MB
  data         bytea NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX uploads_owner_idx ON uploads (owner_id);

COMMENT ON TABLE uploads IS 'Listing photos uploaded through POST /api/uploads and served at /api/uploads/:id.';
