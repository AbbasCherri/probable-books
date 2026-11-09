import { pageTitleClass } from '@/components/layout/pageTitle'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

// STUB: replace with the real page (design doc 5.9).
export default function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <div className="mx-auto max-w-page px-4 py-8">
      <h1 className={pageTitleClass}>This page was torn out.</h1>
    </div>
  )
}
