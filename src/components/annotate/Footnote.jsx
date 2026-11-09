import { cn } from '@/lib/cn'

/**
 * Superscript reference that jumps to its footnote (section 2). Use with <Footnote id>.
 *   $45<FootnoteRef id="retail" n={1} />
 */
export function FootnoteRef({ id, n = 1, className }) {
  return (
    <sup className={cn('ml-0.5 font-sans text-caption font-semibold', className)}>
      <a
        href={`#fn-${id}`}
        id={`fnref-${id}`}
        aria-label={`Footnote ${n}`}
        className="text-pen-600 no-underline hover:text-pen-700 hover:underline"
      >
        {n}
      </a>
    </sup>
  )
}

/**
 * The note itself, linked back to its reference.
 *   <Footnote id="retail" n={1}>New at the bookstore: $189. You save $144.</Footnote>
 */
export function Footnote({ id, n = 1, className, children }) {
  return (
    <p
      id={`fn-${id}`}
      className={cn('border-t border-paper-300 pt-2 text-small text-ink-700', className)}
    >
      <sup className="mr-1 font-semibold text-pen-600">{n}</sup>
      {children}{' '}
      <a
        href={`#fnref-${id}`}
        className="text-pen-600 underline-offset-3 hover:text-pen-700"
        aria-label={`Back to reference ${n}`}
      >
        Back
      </a>
    </p>
  )
}
