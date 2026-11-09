import { ConditionGrade } from '@/components/annotate/ConditionGrade'
import { SectionHeading } from '@/components/layout/SectionHeading'
import { CONDITIONS } from '@/lib/constants'

/** The big red-pen grade, what it means, and the seller's itemised notes (doc 5.3). */
export function ConditionReport({ listing }) {
  const notes = listing.conditionNotes ?? []
  return (
    <section aria-labelledby="condition-heading">
      <SectionHeading title="Condition report" id="condition-heading" />
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
        <ConditionGrade condition={listing.condition} size="lg" className="shrink-0" />
        <div className="min-w-0">
          <p className="text-ink-700">{CONDITIONS[listing.condition]?.description}</p>
          {notes.length > 0 ? (
            <ul
              aria-label="Seller's condition notes"
              className="mt-3 flex flex-col gap-1.5 border-l-2 border-redpen-600 pl-4"
            >
              {notes.map((note, i) => (
                <li key={i} className="break-words text-ink-900">
                  {note}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-small text-ink-500">
              No extra notes from the seller beyond the grade.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
