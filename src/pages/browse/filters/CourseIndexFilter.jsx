import { useState } from 'react'
import { TextField } from '@/components/ui/TextField'
import { cn } from '@/lib/cn'
import { legendClass, checkboxClass } from './filterStyles'

/**
 * Alphabetical course index with dot leaders, listing counts and a find box.
 * courses = [{ code, title, listingCount | count }], selected = ["CHEM 201"].
 */
export function CourseIndexFilter({ courses = [], selected = [], onToggle, className }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = [...courses]
    .sort((a, b) => a.code.localeCompare(b.code))
    .filter((c) => !q || `${c.code} ${c.title}`.toLowerCase().includes(q))

  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className={legendClass}>Course</legend>
      <TextField
        type="search"
        label="Find a course"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="mt-2 max-h-72 overflow-y-auto rounded-paper border border-paper-400 bg-paper-50 px-3">
        {shown.length === 0 ? (
          <p className="py-3 text-ink-500">No course matches</p>
        ) : (
          <ul>
            {shown.map((c) => {
              const count = c.count ?? c.listingCount ?? 0
              return (
                <li key={c.code}>
                  <label className="flex min-h-11 cursor-pointer items-baseline gap-2 py-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(c.code)}
                      onChange={() => onToggle?.(c.code)}
                      className={cn(checkboxClass, 'self-center')}
                    />
                    <span className="min-w-0 text-ink-900">
                      {c.code}
                      <span className="text-small text-ink-500"> {c.title}</span>
                    </span>
                    <span className="dot-leader" aria-hidden="true" />
                    <span className="text-ink-700 italic">{count}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </fieldset>
  )
}
