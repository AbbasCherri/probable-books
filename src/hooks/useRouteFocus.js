import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'

// Long enough for the new page's useDocumentTitle effect to have run.
const ANNOUNCE_DELAY_MS = 100

/**
 * Route-change accessibility for a single-page app (section 9). When the pathname changes (not
 * on the first render, and not for a search-param or hash change on the same page, like a
 * Browse filter or a contents link), focus moves to the element with `targetId` and the new
 * document.title is returned for a polite live region.
 *   const announcement = useRouteFocus('main')
 *   <p aria-live="polite" className="sr-only">{announcement}</p>
 */
export function useRouteFocus(targetId) {
  const { pathname } = useLocation()
  const last = useRef(pathname)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (last.current === pathname) return undefined
    last.current = pathname
    // ScrollRestoration owns the scroll position; focusing must not jump it.
    document.getElementById(targetId)?.focus({ preventScroll: true })
    const timer = setTimeout(() => setAnnouncement(document.title), ANNOUNCE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [pathname, targetId])

  return announcement
}
