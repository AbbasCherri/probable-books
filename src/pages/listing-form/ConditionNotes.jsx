import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { FieldError } from './FieldError'
import { MAX_NOTES, MAX_NOTE_LENGTH, newKey } from './listingForm'

const EXAMPLES = [
  'e.g. Highlighting in ch. 1–4',
  'e.g. Access code used',
  'e.g. Solutions manual not included',
]

/** Up to 5 short condition notes ("Highlighting in ch. 1–4"). */
export function ConditionNotes({ notes, onChange, error }) {
  const [focusKey, setFocusKey] = useState(null)
  const left = MAX_NOTES - notes.length

  function add() {
    const key = newKey('note')
    onChange([...notes, { key, text: '' }])
    setFocusKey(key)
  }

  return (
    <div className="flex flex-col gap-2">
      <p id="listing-notes-label" className="font-medium">
        Condition notes <span className="font-normal text-ink-500">optional</span>
      </p>
      <p id="listing-notes-hint" className="text-sm text-ink-500">
        Up to {MAX_NOTES} short lines. Buyers read these first, so be specific.
      </p>
      {notes.length > 0 && (
        <ul className="flex flex-col gap-2" aria-labelledby="listing-notes-label">
          {notes.map((note, i) => (
            <li key={note.key} className="flex items-center gap-2">
              <label htmlFor={`listing-note-${note.key}`} className="sr-only">
                Condition note {i + 1}
              </label>
              <input
                id={`listing-note-${note.key}`}
                type="text"
                value={note.text}
                maxLength={MAX_NOTE_LENGTH}
                placeholder={EXAMPLES[i % EXAMPLES.length]}
                autoFocus={note.key === focusKey}
                aria-describedby="listing-notes-hint"
                onChange={(e) =>
                  onChange(
                    notes.map((n) =>
                      n.key === note.key ? { ...n, text: e.target.value } : n,
                    ),
                  )
                }
                className="min-h-11 w-full min-w-0 flex-1 rounded-paper border border-b-2 border-paper-400 border-b-ink-500 bg-paper-50 px-3 text-base placeholder:text-ink-500"
              />
              <button
                type="button"
                onClick={() => onChange(notes.filter((n) => n.key !== note.key))}
                aria-label={`Remove note ${i + 1}`}
                className="grid size-11 shrink-0 place-items-center rounded-paper text-ink-700 hover:bg-paper-200"
              >
                <X size={18} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {left > 0 && (
        <button
          id="listing-notes-add"
          type="button"
          onClick={add}
          className="-ml-2.5 inline-flex min-h-11 items-center gap-1.5 self-start rounded-paper px-2.5 font-medium text-pen-600 hover:bg-paper-200 hover:text-pen-700"
        >
          <Plus size={18} strokeWidth={1.5} aria-hidden="true" />
          {notes.length ? `Add another note (${left} left)` : 'Add a note'}
        </button>
      )}
      <FieldError id="listing-notes-error">{error}</FieldError>
    </div>
  )
}
