import { cn } from '@/lib/cn'

/**
 * Section heading with a hairline under it (section 4).
 *   <SectionHeading title="Fresh this week" aside={<Link …>See all new listings</Link>} />
 *   <SectionHeading number={2} title="Courses" size="md" />
 *
 * - number: only for real sequences (the sell form, How selling works). Shown as "§2".
 * - size: "lg" (default) is the H2 page-section style in Literata; "md" is the H3 style in Plex Sans,
 *   for form sections and card groups.
 * - as: the heading element, h2 by default. Keep heading levels in order.
 */
export function SectionHeading({
  number,
  title,
  aside,
  size = 'lg',
  as: Heading = 'h2',
  id,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-paper-300 pb-2.5',
        className,
      )}
    >
      {number != null && (
        <span
          aria-hidden="true"
          className={cn(
            'font-serif font-semibold text-ink-500 tabular-nums',
            size === 'lg' ? 'text-h2' : 'text-h3',
          )}
        >
          §{number}
        </span>
      )}
      <Heading
        id={id}
        className={cn(
          'font-semibold text-ink-900',
          size === 'lg' ? 'font-serif text-h2' : 'font-sans text-h3',
        )}
      >
        {title}
      </Heading>
      {aside && <div className="ml-auto">{aside}</div>}
    </div>
  )
}
