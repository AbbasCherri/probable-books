// Matches a course's required materials to its listings, the same way Browse's q search does.
const SEARCHED = ['title', 'author', 'isbn', 'brand', 'model']

const matches = (listing, keyword) =>
  SEARCHED.some((f) => listing[f]?.toLowerCase().includes(keyword.toLowerCase()))

/**
 * For each material: the keyword that finds the most active listings in its category, those
 * listings' count and lowest price. The keyword goes in the Browse link, so the count there agrees.
 */
export function matchMaterials(materials, listings) {
  const active = listings.filter((l) => l.status === 'active')
  return materials.map((m) => {
    const pool = active.filter((l) => l.category === m.category)
    let best = { keyword: m.keywords[0], items: [] }
    for (const keyword of m.keywords) {
      const items = pool.filter((l) => matches(l, keyword))
      if (items.length > best.items.length) best = { keyword, items }
    }
    return {
      ...m,
      keyword: best.keyword,
      count: best.items.length,
      fromCents: best.items.length
        ? Math.min(...best.items.map((l) => l.priceCents))
        : null,
    }
  })
}

export const checklistKey = (code) => `pb.checklist.${code.replace(' ', '-')}`
