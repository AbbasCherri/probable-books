/** "David Klein, 4th edition" for textbooks, "Texas Instruments TI-84 Plus CE" for gear. */
export function bylineFor(listing) {
  if (listing.category === 'textbook') {
    const edition = listing.edition?.trim()
    return [
      listing.author,
      edition && (/edition/i.test(edition) ? edition : `${edition} edition`),
    ]
      .filter(Boolean)
      .join(', ')
  }
  return [listing.brand, listing.model].filter(Boolean).join(' ')
}
