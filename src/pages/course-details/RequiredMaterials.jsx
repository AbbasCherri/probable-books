import { useState } from 'react'
import { Link } from 'react-router'
import { MarginNote } from '@/components/annotate/MarginNote'
import { SectionHeading } from '@/components/layout/SectionHeading'
import { cn } from '@/lib/cn'
import { codeToSlug } from '@/lib/courses'
import { formatPrice, plural } from '@/lib/format'
import { readJSON, writeJSON } from '@/lib/storage'
import { checklistKey, matchMaterials } from './materials'

/**
 * The syllabus list (section 5.4): an "I have this" checkbox per item, saved on this device per
 * course, and a link to the listings that match it. Course tips sit in the margin from lg.
 * Mount with key={course.code} so the checklist reloads when the course changes.
 */
export function RequiredMaterials({ course, listings, loading }) {
  const key = checklistKey(course.code)
  const [have, setHave] = useState(() => new Set(readJSON(key, [])))
  const rows = matchMaterials(course.requiredMaterials, listings)
  const slug = codeToSlug(course.code)

  function toggle(id) {
    setHave((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      writeJSON(key, [...next])
      return next
    })
  }

  const ticked = rows.filter((r) => have.has(r.id)).length

  return (
    <section aria-labelledby="materials-heading">
      <SectionHeading
        title="Required materials"
        id="materials-heading"
        aside={
          <p aria-live="polite" className="text-small text-ink-500">
            {ticked} of {rows.length} ticked
          </p>
        }
      />
      <p className="mt-3 text-small text-ink-500">
        Tick what you already have. It&apos;s saved on this device only.
      </p>

      {/* Flex column: on phones the tips follow the list; from lg the absolutely placed note
          sits level with the top of the list. */}
      <div className="mt-4 flex flex-col">
        <ul>
          {rows.map((r) => {
            const id = `have-${r.id}`
            const checked = have.has(r.id)
            return (
              <li
                key={r.id}
                className="flex flex-col gap-1 border-b border-paper-300 py-3 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <label
                  htmlFor={id}
                  className="flex min-h-11 flex-1 cursor-pointer items-center gap-3"
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(r.id)}
                    className="size-5 shrink-0 cursor-pointer accent-ink-900"
                  />
                  <span
                    className={cn(
                      'font-serif text-reading text-ink-900',
                      checked && 'text-ink-500 line-through decoration-redpen-600',
                    )}
                  >
                    <span className="sr-only">I have: </span>
                    {r.label}
                  </span>
                </label>
                <div className="pl-8 text-small sm:pl-0 sm:text-right">
                  {loading ? (
                    <span className="text-ink-500">Checking listings…</span>
                  ) : r.count > 0 ? (
                    <Link
                      to={`/browse?course=${slug}&category=${r.category}&q=${encodeURIComponent(r.keyword)}`}
                      className="inline-flex min-h-11 items-center"
                    >
                      {plural(r.count, 'listing')} from {formatPrice(r.fromCents)}
                      <span className="sr-only"> for {r.label}</span>
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-11 items-center text-ink-500">
                      None listed yet
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        {course.tips.length > 0 && (
          <MarginNote className="order-last mt-5 flex flex-col gap-3 lg:mt-0">
            {course.tips.slice(0, 3).map((tip) => (
              <p key={tip}>{tip}</p>
            ))}
          </MarginNote>
        )}
      </div>
    </section>
  )
}
