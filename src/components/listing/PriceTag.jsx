import { FootnoteRef } from '@/components/annotate/Footnote'
import { cn } from '@/lib/cn'
import { formatPrice, percentUnderRetail } from '@/lib/format'

const SIZES = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-h1',
}

/**
 * Price in Literata with lining, tabular figures (section 3, Figures).
 *   <PriceTag cents={4500} retailCents={18900} />                 $45, "76% under retail" below
 *   <PriceTag cents={4500} retailCents={18900} footnoteId="r" />  $45¹; render the <Footnote id="r"> yourself
 */
export function PriceTag({
  cents,
  retailCents,
  size = 'md',
  footnoteId,
  showSavings = true,
  className,
}) {
  const under = percentUnderRetail(cents, retailCents)
  return (
    <div className={cn('flex flex-col', className)}>
      <p
        className={cn(
          'font-serif leading-none font-semibold text-ink-900 lining-nums tabular-nums',
          SIZES[size] ?? SIZES.md,
        )}
      >
        {formatPrice(cents)}
        {under != null && footnoteId && <FootnoteRef id={footnoteId} />}
      </p>
      {under != null && showSavings && (
        <p className="mt-1 text-sm text-ink-500">{under}% under retail</p>
      )}
    </div>
  )
}
