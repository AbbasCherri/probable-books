import { cn } from '@/lib/cn'

/**
 * A blank page with a handwritten note and one action (section 4).
 *   <EmptyState title="No offers yet." note="Listings with photos get more." action={<Button …/>} />
 */
export function EmptyState({ title, note, action, as: Heading = 'h2', className }) {
  return (
    <div
      className={cn(
        'max-w-lg rounded-paper border border-paper-300 bg-paper-50 px-6 pt-5 pb-6',
        className,
      )}
    >
      {/* Ruled lines, like a fresh page. Decorative. */}
      <div aria-hidden="true" className="mb-5 flex flex-col gap-5">
        <span className="border-t border-paper-300" />
        <span className="border-t border-paper-300" />
        <span className="border-t border-paper-300" />
      </div>
      <Heading className="text-h3 font-semibold text-ink-900">{title}</Heading>
      {note && <p className="mt-1 font-hand text-note text-graphite">{note}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
