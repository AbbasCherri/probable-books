import { cn } from '@/lib/cn'

/**
 * A handwritten note tied to the content it sits next to (section 2).
 * Below lg it is an inline callout under that content. From lg it moves into the margin column,
 * level with where it appears in the text, as long as the page's PageShell has a margin column
 * (pass `margin` or `annotated` to PageShell).
 * Never the only place a fact appears, and about three per screen at most.
 *   <MarginNote>Spine is solid. Clean after ch. 6</MarginNote>
 */
export function MarginNote({ tone = 'graphite', className, children }) {
  return (
    <div
      role="note"
      className={cn(
        'border-l border-dotted border-graphite pl-3 font-hand text-note',
        'lg:absolute lg:left-full lg:ml-14 lg:w-margin lg:-rotate-1 lg:border-0 lg:pl-8',
        tone === 'pen' ? 'text-pen-700' : 'text-graphite',
        className,
      )}
    >
      {children}
    </div>
  )
}
