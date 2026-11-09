import { pageTitleClass } from '@/components/layout/pageTitle'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

// STUB: replace with the real page (design doc 7).
export default function StyleguidePage() {
  useDocumentTitle('Styleguide')
  return (
    <div className="mx-auto max-w-page px-4 py-8">
      <h1 className={pageTitleClass}>Styleguide</h1>
    </div>
  )
}
