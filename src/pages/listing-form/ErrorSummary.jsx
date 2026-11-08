import { CircleAlert } from 'lucide-react'

function jumpTo(event, id) {
  event.preventDefault()
  const el = document.getElementById(id)
  if (!el) return
  el.focus()
  el.scrollIntoView({ block: 'center' })
}

/**
 * Shown after a failed submit. The page moves focus here (focusRef) so screen
 * readers hear the count; each link moves focus to its field.
 */
export function ErrorSummary({ errors, verb, focusRef }) {
  const n = errors.length
  return (
    <div
      ref={focusRef}
      tabIndex={-1}
      aria-labelledby="listing-error-summary"
      className="mt-8 max-w-2xl rounded-paper border-2 border-redpen-600 bg-paper-50 px-5 py-4"
    >
      <h2
        id="listing-error-summary"
        className="flex items-center gap-2 text-lg font-semibold"
      >
        <CircleAlert
          size={20}
          strokeWidth={1.5}
          aria-hidden="true"
          className="text-redpen-600"
        />
        Fix {n} {n === 1 ? 'thing' : 'things'} to {verb}
      </h2>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-7">
        {errors.map((e) => (
          <li key={e.field}>
            <a
              href={`#${e.id}`}
              onClick={(event) => jumpTo(event, e.id)}
              className="font-medium text-pen-600 underline underline-offset-3 hover:text-pen-700"
            >
              {e.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
