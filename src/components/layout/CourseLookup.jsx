import { useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAsync } from '@/hooks/useAsync'
import { getCourses } from '@/services/api'
import { codeToSlug, normalizeCode } from '@/lib/courses'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'

const MAX_OPTIONS = 6

export function CourseLookup({ onNavigate, autoFocus = false, className }) {
  const navigate = useNavigate()
  const uid = useId()
  const inputId = `${uid}-input`
  const listId = `${uid}-list`
  const { data: courses } = useAsync(() => getCourses(), [])
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const options = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q || !courses) return []
    const compact = q.replace(/[\s-]/g, '')
    return courses
      .filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.code.toLowerCase().replace(' ', '').includes(compact) ||
          (c.title ?? '').toLowerCase().includes(q),
      )
      .slice(0, MAX_OPTIONS)
  }, [courses, value])

  const expanded = open && options.length > 0
  const optionId = (i) => `${uid}-opt-${i}`

  function go(to) {
    navigate(to)
    setOpen(false)
    setActive(-1)
    onNavigate?.()
  }

  function submit() {
    const chosen = expanded && active >= 0 ? options[active] : null
    if (chosen) return go(`/courses/${codeToSlug(chosen.code)}`)
    const text = value.trim()
    if (!text) return
    const code = normalizeCode(text)
    // A well-formed code goes straight to its course page; unknown codes get its own 404 state.
    if (code) return go(`/courses/${codeToSlug(code)}`)
    go(`/browse?q=${encodeURIComponent(text)}`)
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
          <ul
            id={listId}
            role="listbox"
            aria-label="Matching courses"
            hidden={!expanded}
            className="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-paper border border-paper-400 bg-paper-50 shadow-stack"
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
                  'flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-small',
                  i === active
                    ? 'bg-hl-blue text-on-mark'
                    : 'text-ink-900 hover:bg-paper-200',
                )}
              >
                <span className="font-semibold">{c.code}</span>
                <span className="truncate">{c.title}</span>
              </li>
            ))}
          </ul>
        </div>
        <Button type="submit" className="w-full sm:w-auto">
          Look up
        </Button>
      </div>
    </form>
  )
}
