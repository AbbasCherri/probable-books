import { useEffect } from 'react'

const SITE = 'Probable Books'

/**
 * Sets the tab title to "<title> | Probable Books" while the page is mounted, and puts back
 * "Probable Books" when it unmounts, so a page without a title never shows the last one's.
 *   useDocumentTitle('Browse used course gear')
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE}` : SITE
    return () => {
      document.title = SITE
    }
  }, [title])
}
