import { useId, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { CourseTab } from '@/components/annotate/CourseTab'
import { Highlight } from '@/components/annotate/Highlight'
import { cn } from '@/lib/cn'
import { FieldError } from './FieldError'
import { MAX_COURSES, courseFromSlug } from './listingForm'

const MAX_SUGGESTIONS = 6

/** "chem2" / "CHEM-2" / "chem 2" -> "CHEM 2" so it lines up with codes like "CHEM 201". */
function normalize(query) {
  return query
    .trim()
    .toUpperCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^([A-Z]{2,4})(\d)/, '$1 $2')
}

/** Matches on the start of the code, or anywhere in the title once 3+ letters are typed. */
function matchCourses(courses, query, selected) {
  const q = normalize(query)
  if (!q) return []
  const out = []
  for (const course of courses) {
    if (selected.includes(course.code)) continue
    if (course.code.startsWith(q)) {
      out.push({ course, on: 'code', at: 0, len: q.length })
    } else if (q.length >= 3) {
      const at = course.title.toUpperCase().indexOf(q)
      if (at >= 0) out.push({ course, on: 'title', at, len: q.length })
    }
    if (out.length >= MAX_SUGGESTIONS) break
  }
  return out
}

function Marked({ text, at, len }) {
  if (len <= 0) return text
  return (
    <>
      {text.slice(0, at)}
      <Highlight color="yellow">{text.slice(at, at + len)}</Highlight>
      {text.slice(at + len)}
    </>
  )
}

/**
 * ARIA 1.2 combobox for 1 to 5 course codes, shown as course tabs.
 * Type a code or a title word, arrow to a suggestion, Enter to add.
 * Backspace in an empty box removes the last course.
 */
export function CourseCombobox({
  id,
  value,
  onChange,
  onBlur,
  courses,
  loading = false,
  error,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [notice, setNotice] = useState('') // spoken only: "CHEM 201 added."
  const [warning, setWarning] = useState('') // shown and spoken: limit reached, unknown code
  const inputRef = useRef(null)
  const listId = useId()

  const matches = useMemo(
    () => matchCourses(courses, query, value),
    [courses, query, value],
  )
  const showList = open && query.trim() !== ''
  const activeIndex = Math.min(active, Math.max(matches.length - 1, 0))
  const full = value.length >= MAX_COURSES

  function add(code) {
    if (value.includes(code)) return
    if (full) {
      setWarning(`${MAX_COURSES} courses is the limit. Remove one to add another.`)
      return
    }
    onChange([...value, code])
    setQuery('')
    setActive(0)
    setWarning('')
    setNotice(`${code} added.`)
  }

  function remove(code) {
    onChange(value.filter((c) => c !== code))
    setWarning('')
    setNotice(`${code} removed.`)
    inputRef.current?.focus()
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, Math.max(matches.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (!query.trim()) return
      e.preventDefault()
      const pick = matches[activeIndex]
      if (pick) add(pick.course.code)
      else {
        const code = courseFromSlug(query)
        if (code && courses.some((c) => c.code === code)) add(code)
        else if (loading)
          setWarning('The course index is still loading. Try again in a second.')
        else
          setWarning(
            `No ${code ?? `“${query.trim()}”`} in the index. Codes look like CHEM 201.`,
          )
      }
    } else if (e.key === 'Escape') {
      if (showList) {
        e.preventDefault()
        setOpen(false)
      } else setQuery('')
    } else if (e.key === 'Backspace' && !query && value.length) {
      remove(value[value.length - 1])
    }
  }

  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        Which courses use it
      </label>
      <div className="relative">
        <div
          className={cn(
            'flex min-h-13 flex-wrap items-center gap-1.5 rounded-paper border border-b-2 border-paper-400 px-2 py-1.5',
            'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-pen-600',
            error ? 'border-b-redpen-600 bg-redpen-50' : 'border-b-ink-500 bg-paper-50',
          )}
        >
          {value.map((code) => (
            <span key={code} className="inline-flex items-center">
              <CourseTab code={code} />
              <button
                type="button"
                onClick={() => remove(code)}
                aria-label={`Remove ${code}`}
                className="grid size-11 place-items-center rounded-paper text-ink-900 hover:bg-paper-200"
              >
                <X size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={listId}
            aria-activedescendant={
              showList && matches.length ? `${listId}-${activeIndex}` : undefined
            }
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={query}
            placeholder={
              value.length ? 'Add another course' : 'Add a course, like CHEM 201'
            }
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
              setOpen(true)
              setWarning('')
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              setOpen(false)
              onBlur?.()
            }}
            onKeyDown={onKeyDown}
            className="min-h-10 min-w-36 flex-1 bg-transparent px-1.5 text-base outline-none placeholder:text-ink-500"
          />
        </div>

        {showList && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Matching courses"
            className="absolute inset-x-0 top-full z-20 mt-1 rounded-paper border border-paper-400 bg-paper-50 py-1 shadow-stack"
          >
            {matches.map((m, i) => (
              <li
                key={m.course.code}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                // mousedown, not click, so the input keeps focus
                onMouseDown={(e) => {
                  e.preventDefault()
                  add(m.course.code)
                }}
                onMouseMove={() => setActive(i)}
                className={cn(
                  'flex min-h-12 cursor-pointer flex-col justify-center px-3.5 py-1.5 sm:flex-row sm:items-baseline sm:justify-start sm:gap-3',
                  i === activeIndex && 'bg-pen-50',
                )}
              >
                <span className="font-condensed font-semibold">
                  {m.on === 'code' ? (
                    <Marked text={m.course.code} at={m.at} len={m.len} />
                  ) : (
                    m.course.code
                  )}
                </span>
                <span className="text-sm text-ink-700 sm:text-base">
                  {m.on === 'title' ? (
                    <Marked text={m.course.title} at={m.at} len={m.len} />
                  ) : (
                    m.course.title
                  )}
                </span>
              </li>
            ))}
            {matches.length === 0 && (
              <li
                role="option"
                aria-selected="false"
                aria-disabled="true"
                className="px-3.5 py-2.5 text-ink-700"
              >
                {loading
                  ? 'Loading the course index…'
                  : `No course matches “${query.trim()}”. Codes look like CHEM 201.`}
              </li>
            )}
          </ul>
        )}
      </div>
      <p id={hintId} className="text-sm text-ink-500">
        {value.length} of {MAX_COURSES} added. Buyers search by code, so add every course
        that uses it.
      </p>
      <FieldError id={errorId}>{error}</FieldError>
      {warning && <p className="text-sm text-ink-700">{warning}</p>}
      <p aria-live="polite" className="sr-only">
        {warning || notice}
      </p>
    </div>
  )
}
