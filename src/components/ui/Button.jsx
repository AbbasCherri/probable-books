import { cn } from '@/lib/cn'

const VARIANTS = {
  ink: 'border-ink-900 bg-ink-900 font-semibold text-paper-50 hover:border-ink-700 hover:bg-ink-700',
  outline: 'border-ink-900 bg-paper-50 text-ink-900 hover:bg-paper-200',
  ghost: 'border-transparent bg-transparent text-ink-900 hover:bg-paper-200',
  redpen:
    'border-redpen-600 bg-transparent text-redpen-600 hover:border-redpen-700 hover:bg-redpen-50 hover:text-redpen-700',
}

const SIZES = {
  sm: 'min-h-10 gap-1.5 px-3 text-small',
  md: 'min-h-11 gap-2 px-4',
  lg: 'min-h-12 gap-2 px-5',
}

/**
 * Every action on the site (section 4).
 *   <Button>Publish listing</Button>
 *   <Button variant="outline" size="lg">Save draft</Button>
 *   <Button as={Link} to="/sell">Sell something</Button>
 * Verb-first labels, no arrows appended.
 */
export function Button({
  as: Component = 'button',
  variant = 'ink',
  size = 'md',
  type,
  className,
  ...props
}) {
  return (
    <Component
      type={Component === 'button' ? (type ?? 'button') : type}
      className={cn(
        'inline-flex items-center justify-center rounded-paper border text-center leading-tight no-underline transition-paper',
        'disabled:pointer-events-none disabled:border-paper-300 disabled:bg-paper-200 disabled:text-ink-300',
        VARIANTS[variant] ?? VARIANTS.ink,
        SIZES[size] ?? SIZES.md,
        className,
      )}
      {...props}
    />
  )
}
