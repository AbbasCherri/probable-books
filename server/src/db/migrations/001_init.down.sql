-- Reverses 001_init.sql. Development and test databases only: this DESTROYS ALL DATA.
-- Run it in one transaction on Neon's DIRECT connection string.

DROP TABLE IF EXISTS offers          CASCADE;
DROP TABLE IF EXISTS listing_photos  CASCADE;
DROP TABLE IF EXISTS listing_courses CASCADE;
DROP TABLE IF EXISTS listings        CASCADE;
DROP TABLE IF EXISTS courses         CASCADE;
DROP TABLE IF EXISTS users           CASCADE;

DROP FUNCTION IF EXISTS text_array_max_length(text[]);
DROP FUNCTION IF EXISTS set_updated_at();

DROP DOMAIN IF EXISTS course_code;
DROP DOMAIN IF EXISTS pickup_spot;

DROP TYPE IF EXISTS offer_status;
DROP TYPE IF EXISTS listing_status;
DROP TYPE IF EXISTS listing_condition;
DROP TYPE IF EXISTS listing_category;

-- pg_trgm is left installed; it is harmless and other objects may use it.
