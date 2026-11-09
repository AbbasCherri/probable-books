import { pageTitleClass } from '@/components/layout/pageTitle'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

// STUB: replace with the real page (design doc 5.3).
export default function ListingDetailsPage() {
  useDocumentTitle('Listing')
  return (
    <div className="mx-auto max-w-page px-4 py-8">
      <h1 className={pageTitleClass}>Listing details</h1>
    </div>
  )
}
