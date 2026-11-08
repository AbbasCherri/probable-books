import { SectionHeading } from '@/components/layout/SectionHeading'
import { Link } from 'react-router'
import { Footnote, FootnoteRef } from '@/components/annotate/Footnote'
import { Button } from '@/components/ui/Button'

export function HowSellingWorks() {
  return (
    <section aria-labelledby="selling-heading" id="selling" className="scroll-mt-20">
      <SectionHeading title="How selling works" id="selling-heading" />
      <ol className="mt-6 max-w-prose list-decimal space-y-4 pl-6 text-body marker:font-serif marker:italic">
        <li>
          <strong className="font-serif">Photograph it.</strong> One clear shot of the
          cover, one of the spine. Show the highlighting if there is any.
        </li>
        <li>
          <strong className="font-serif">Tag the courses.</strong> Buyers find you by
          course code, so add every class that uses it.
        </li>
        <li>
          <strong className="font-serif">Grade the condition.</strong> Be honest. A
          well-worn book priced fairly sells faster than a lie.
          <FootnoteRef id="grades" n={1} />
        </li>
        <li>
          <strong className="font-serif">Meet on campus.</strong> Pick a public spot, hand
          it over, get paid.
          <FootnoteRef id="payment" n={2} />
        </li>
      </ol>
      <div className="mt-6 max-w-prose space-y-1 text-small text-ink-700">
        <Footnote id="grades" n={1}>
          Grades run from A+ (unused) down to D (loose pages).
        </Footnote>
        <Footnote id="payment" n={2}>
          Payment happens in person. Nothing is charged through the site.
        </Footnote>
      </div>
      <Button as={Link} to="/sell" className="mt-8">
        Sell something
      </Button>
    </section>
  )
}
