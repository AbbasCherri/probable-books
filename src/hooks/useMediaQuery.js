import { useSyncExternalStore } from 'react'

/** True while the CSS media query matches, e.g. useMediaQuery('(min-width: 64rem)'). */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', notify)
      return () => mq.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
