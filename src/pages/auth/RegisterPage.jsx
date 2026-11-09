import { pageTitleClass } from '@/components/layout/pageTitle'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

// STUB: replace with the real page (design doc 5.8).
export default function RegisterPage() {
  useDocumentTitle('Get a card')
  return (
    <div className="mx-auto max-w-page px-4 py-8">
      <h1 className={pageTitleClass}>Register</h1>
    </div>
  )
}
