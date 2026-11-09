import { useEffect } from 'react'
import { cn } from '@/lib/cn'

const VARIANTS = {
  ink: 'border-ink-900 bg-ink-900 font-semibold text-paper-50 hover:border-ink-700 hover:bg-ink-700',
  outline: 'border-ink-900 bg-paper-50 text-ink-900 hover:bg-paper-200',
  ghost: 'border-transparent bg-transparent text-ink-900 hover:bg-paper-200',
  redpen:
    'border-redpen-600 bg-transparent text-redpen-600 hover:border-redpen-700 hover:bg-redpen-50 hover:text-redpen-700',
  // A prose link's look (same colour and 2px underline offset as the base `a` rule), with the
  // button's 44px hit area. No side padding, so it lines up with the text around it.
  link: 'min-w-11 border-transparent bg-transparent px-0 text-pen-600 underline underline-offset-2 hover:text-pen-700',
}

// Every size is at least 44px tall (section 3, Targets).
const SIZES = {
  sm: 'min-h-11 gap-1.5 px-3 text-small',
  md: 'min-h-11 gap-2 px-4',
  lg: 'min-h-12 gap-2 px-5',
  icon: 'size-11 shrink-0 gap-0 p-0',
}

/**
 * Every action on the site (section 4).
 *   <Button>Publish listing</Button>
 *   <Button variant="outline" size="lg">Save draft</Button>
 *   <Button as={Link} to="/sell">Sell something</Button>
 *   <Button variant="link" as={Link} to="/dashboard">Cancel</Button>   text link look, 44px hit area
 *   <Button size="icon" variant="ghost" aria-label="Close"><X aria-hidden="true" /></Button>
 * variant: ink (default), outline, ghost, redpen, link. size: sm, md (default), lg (all at least
 * 44px tall), icon (a 44px square; give it an aria-label). Verb-first labels, no arrows appended.
 */
export function Button({
  as: Component = 'button',
  variant = 'ink',
  size = 'md',
  type,
  className,
  ...props
}) {
  const unnamedIcon = size === 'icon' && !props['aria-label'] && !props['aria-labelledby']
  useEffect(() => {
    if (import.meta.env.DEV && unnamedIcon) {
      // eslint-disable-next-line no-console
      console.warn('Button size="icon" needs an aria-label (it has no visible text).')
    }
  }, [unnamedIcon])

  return (
    <Component
      type={Component === 'button' ? (type ?? 'button') : type}
      className={cn(
        'inline-flex items-center justify-center rounded-paper border text-center leading-tight no-underline transition-paper',
        'disabled:pointer-events-none disabled:border-paper-300 disabled:bg-paper-200 disabled:text-ink-300',
        SIZES[size] ?? SIZES.md,
        VARIANTS[variant] ?? VARIANTS.ink,
        variant === 'link' && 'disabled:border-transparent disabled:bg-transparent',
        className,
      )}
      {...props}
    />
  )
}
