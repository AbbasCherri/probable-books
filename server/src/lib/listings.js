// Shared listing reads: one SELECT list and one serializer, so every endpoint returns the
// exact Listing shape from requirements A6 (camelCase, nulls never omitted, [] for empty lists).

/**
 * Columns for `FROM listings l`. Course codes and photos come from their own tables, in
 * display order. course_code is a domain, so the array is cast to text[] for node-postgres.
 */
export const LISTING_COLUMNS = `
  l.id, l.title, l.category, l.author, l.edition, l.isbn, l.brand, l.model,
  l.condition, l.condition_notes, l.description, l.price_cents, l.retail_cents,
  l.open_to_offers, l.pickup_spot, l.status, l.featured, l.seller_id,
  l.created_at, l.updated_at,
  COALESCE((SELECT array_agg(lc.course_code ORDER BY lc.position)::text[]
              FROM listing_courses lc WHERE lc.listing_id = l.id), '{}'::text[]) AS course_codes,
  COALESCE((SELECT json_agg(json_build_object('url', p.url, 'alt', p.alt) ORDER BY p.position)
              FROM listing_photos p WHERE p.listing_id = l.id), '[]'::json) AS photos`

const iso = (d) => (d instanceof Date ? d.toISOString() : d)

/** Database row (selected with LISTING_COLUMNS) to the A6 Listing shape. */
export function toListing(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    courseCodes: row.course_codes ?? [],
    author: row.author,
    edition: row.edition,
    isbn: row.isbn,
    brand: row.brand,
    model: row.model,
    condition: row.condition,
    conditionNotes: row.condition_notes ?? [],
    description: row.description ?? '',
    priceCents: row.price_cents,
    retailCents: row.retail_cents,
    openToOffers: row.open_to_offers,
    photos: row.photos ?? [],
    pickupSpot: row.pickup_spot,
    status: row.status,
    featured: row.featured,
    sellerId: row.seller_id,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}
