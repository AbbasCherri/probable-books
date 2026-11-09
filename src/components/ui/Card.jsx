import { cn } from '@/lib/cn'

const PADDING = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
}

/**
 * A sheet of paper (section 3, Depth): paper-50, hairline paper-400 border, 2px corners and the
 * hard stack shadow. Cards never move on hover; darken the border instead if it is clickable.
 *   <Card as="article" aria-label="Your offer on Organic Chemistry">...</Card>
 *   <Card padding="none" className="overflow-hidden">...</Card>
 * as: the element (div by default). padding: md (default, p-4, p-5 from sm), sm, none.
 */
export function Card({ as: Component = 'div', padding = 'md', className, ...props }) {
  return (
    <Component
      className={cn('paper-card', PADDING[padding] ?? PADDING.md, className)}
      {...props}
    />
  )
}
