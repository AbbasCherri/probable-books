import { useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { codeToSlug, matchCourses, normalizeCode } from '@/lib/courses'
import { cn } from '@/lib/cn'
import { plural } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Popover } from '@/components/ui/Popover'

const MAX_OPTIONS = 6

/**
 * Course lookup: a combobox of course codes and titles, then Look up (section 5.1).
 *   const { courses } = useCourses(open)     // from CoursesProvider; components never fetch
 *   <CourseLookup courses={courses} autoFocus onNavigate={close} />
 * courses: [{ code, title }] or null while they load (a typed code still works: it goes
 * straight to its course page; anything else searches Browse).
 * Keyboard: arrows/Home/End move through the list, Enter picks; the first Esc closes the list,
 * the next clears the text, and only then does Esc reach whatever holds the lookup.
 * The match count is announced through a visually hidden status.
 */
export function CourseLookup({ courses, onNavigate, autoFocus = false, className }) {
  const navigate = useNavigate()
  const uid = useId()
  const inputId = `${uid}-input`
  const listId = `${uid}-list`
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const query = value.trim()
  const options = useMemo(
    () => (query && courses ? matchCourses(courses, query, { limit: MAX_OPTIONS }) : []),
    [courses, query],
  )

  const expanded = open && options.length > 0
  const optionId = (i) => `${uid}-opt-${i}`
  const count =
    !query || !courses
      ? ''
      : options.length
        ? `${plural(options.length, 'course')} found`
        : 'No matching courses'

  function go(to) {
    navigate(to)
    setOpen(false)
    setActive(-1)
    onNavigate?.()
  }

  function submit() {
    const chosen = expanded && active >= 0 ? options[active] : null
    if (chosen) return go(`/courses/${codeToSlug(chosen.code)}`)
    if (!query) return
    const code = normalizeCode(query)
    // A well-formed code goes straight to its course page; unknown codes get its own 404 state.
    if (code) return go(`/courses/${codeToSlug(code)}`)
    go(`/browse?q=${encodeURIComponent(query)}`)
  }

  function onKeyDown(e) {
    const last = options.length - 1
    if (e.key === 'ArrowDown') {
      if (options.length === 0) return
      e.preventDefault()
      setOpen(true)
      setActive((a) => (a >= last ? 0 : a + 1))
    } else if (e.key === 'ArrowUp') {
      if (options.length === 0) return
      e.preventDefault()
      setOpen(true)
      setActive((a) => (a <= 0 ? last : a - 1))
    } else if (e.key === 'Home' && expanded) {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End' && expanded) {
      e.preventDefault()
      setActive(last)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    } else if (e.key === 'Escape') {
      // One thing per press: close the list, then clear the text, then let it bubble.
      if (expanded) {
        setOpen(false)
        setActive(-1)
      } else if (value) {
        setValue('')
      } else {
        return
      }
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return (
    <form
      className={cn('flex flex-col gap-2', className)}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <label htmlFor={inputId} className="text-small font-semibold">
        Course code or title
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <input
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
            autoFocus={autoFocus}
            autoComplete="off"
            value={value}
            placeholder="CHEM 201 or organic"
            onChange={(e) => {
              setValue(e.target.value)
              setOpen(true)
              setActive(-1)
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setOpen(false)}
            className="min-h-11 w-full rounded-paper border border-ink-500 bg-paper-50 px-3 text-body text-ink-900"
          />
          <Popover
            as="ul"
            open={expanded}
            align="stretch"
            id={listId}
            role="listbox"
            aria-label="Matching courses"
            className="max-h-72 overflow-y-auto py-1"
          >
            {options.map((c, i) => (
              <li
                key={c.code}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(`/courses/${codeToSlug(c.code)}`)}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-3 border-l-2 px-3 py-2 text-small text-ink-900',
                  i === active
                    ? 'border-ink-900 bg-paper-200 font-semibold'
                    : 'border-transparent hover:bg-paper-200',
                )}
              >
                <span className="font-semibold">{c.code}</span>
                <span className="truncate">{c.title}</span>
              </li>
            ))}
          </Popover>
          <p role="status" className="sr-only">
            {count}
          </p>
        </div>
        <Button type="submit" className="w-full sm:w-auto">
          Look up
        </Button>
      </div>
    </form>
  )
}
