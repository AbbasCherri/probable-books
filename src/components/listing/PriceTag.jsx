import { FootnoteRef } from '@/components/annotate/Footnote'
import { cn } from '@/lib/cn'
import { formatPrice, percentUnderRetail } from '@/lib/format'

const SIZES = {
  sm: 'text-lead',
  md: 'text-price',
  lg: 'text-h2',
  xl: 'text-h1',
}

const TONES = {
  default: 'text-ink-900',
  // Ballpoint blue: offer amounts (section 3).
  pen: 'text-pen-600',
  // Off the table: a declined offer, a sold listing.
  muted: 'text-ink-500',
}

/**
 * Price in Literata with lining, tabular figures (section 3, Figures).
 *   <PriceTag cents={4500} retailCents={18900} />                 $45, "76% under retail" below
 *   <PriceTag cents={4500} retailCents={18900} footnoteId="r" />  $45¹; render the <Footnote id="r"> yourself
 *   <PriceTag cents={4000} size="lg" tone="pen" />                an offer amount
 *   <p><PriceTag as="span" cents={4000} tone="pen" /> from Sam</p>   inline, inside a sentence
 * size: sm (lead, ledger rows), md (default, price), lg (h2, offer notes), xl (h1, the listing
 * page). tone: default (ink), pen (offers), muted (declined, sold).
 * as: 'div' (default, the savings line stacks below) or 'span' (inline, no savings line).
 */
export function PriceTag({
  cents,
  retailCents,
  size = 'md',
  tone = 'default',
  as = 'div',
  footnoteId,
  showSavings = true,
  className,
}) {
  const under = percentUnderRetail(cents, retailCents)
  const inline = as === 'span'
  const Figure = inline ? 'span' : 'p'
  const figure = (
    <Figure
      className={cn(
        'font-serif leading-none font-semibold lining-nums tabular-nums',
        SIZES[size] ?? SIZES.md,
        TONES[tone] ?? TONES.default,
        inline && className,
      )}
    >
      {formatPrice(cents)}
      {under != null && footnoteId && <FootnoteRef id={footnoteId} />}
    </Figure>
  )
  if (inline) return figure
  return (
    <div className={cn('flex flex-col', className)}>
      {figure}
      {under != null && showSavings && (
        <p className="mt-1 text-small text-ink-500">{under}% under retail</p>
      )}
    </div>
  )
}
