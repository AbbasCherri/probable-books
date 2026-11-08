import { useMemo } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { formatPrice } from '@/lib/format'
import * as api from '@/services/api'

/** The margin hint in §5: what similar listings for the first course go for. */
export function usePriceHint(courseCode, category, excludeId) {
  const similar = useAsync(
    () =>
      courseCode
        ? api.getListings({ courses: [courseCode], categories: [category] })
        : Promise.resolve(null),
    [courseCode, category],
  )

  return useMemo(() => {
    if (!courseCode) return 'Add a course to see what similar listings go for.'
    const items = (similar.data?.items ?? []).filter((l) => l.id !== excludeId)
    if (similar.loading && !similar.data) return ''
    if (items.length === 0)
      return `Nothing else listed for ${courseCode} yet. You set the price.`
    const prices = items.map((l) => l.priceCents).sort((a, b) => a - b)
    const low = prices[0]
    const high = prices[prices.length - 1]
    if (low === high) return `Similar ${courseCode} listings go for ${formatPrice(low)}.`
    return `Similar ${courseCode} listings go for ${formatPrice(low)} to ${formatPrice(high)}.`
  }, [courseCode, excludeId, similar.data, similar.loading])
}
