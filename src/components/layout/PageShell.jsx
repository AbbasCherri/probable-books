import { cn } from '@/lib/cn'

/**
 * The page frame (section 4): running header, the page's one h1, and an optional margin column.
 *
 *   <PageShell chapter="Listing, CHEM 201" title="Organic Chemistry, 4th edition" margin={<SellerNotes />}>
 *
 * - chapter: the running header, an italic serif line in sentence case. Phones show only the
 *   part before the first comma ("Listing").
 * - title: the h1. Pass `display` for the homepage title page. Pass title={null} to render your own h1.
 * - margin: content for the 15rem margin column. From lg it sits beside the text block behind a dotted
 *   rule; below lg it follows the content. Pass `annotated` instead when the page only uses
 *   <MarginNote>s, so the column is reserved for them.
 * The folio (page number) is in the footer, from the route's handle.
 */
export function PageShell({
  chapter,
  title,
  display = false,
  margin,
  annotated = false,
  className,
  children,
}) {
  const hasMargin = Boolean(margin) || annotated
  const shortChapter = chapter?.split(',')[0]

  return (
    // RootLayout owns <main id="main">; this is the frame inside it.
    <div className={cn('mx-auto w-full max-w-page flex-1 px-4 pb-20 sm:px-8', className)}>
      {chapter && (
        <div className="flex items-center gap-4 pt-5 sm:pt-6">
          <p className="font-serif text-sm text-ink-500 italic">
            <span className="sm:hidden">{shortChapter}</span>
            <span className="hidden sm:inline">{chapter}</span>
          </p>
          <span aria-hidden="true" className="flex-1 border-t border-paper-300" />
        </div>
      )}

      {title && (
        <h1
          className={cn(
            'mt-5 font-serif font-semibold tracking-tight text-ink-900 sm:mt-6',
            display ? 'text-display-sm lg:text-display' : 'text-h1-sm sm:text-h1',
          )}
        >
          {title}
        </h1>
      )}

      <div className={cn(hasMargin && 'lg:flex lg:items-stretch lg:gap-14')}>
        <div className={cn('min-w-0 flex-1', hasMargin && 'lg:relative')}>{children}</div>
        {hasMargin && (
          <aside
            aria-label="Margin"
            className={cn(
              'mt-12 lg:mt-0 lg:w-margin lg:shrink-0 lg:border-l lg:border-dotted lg:border-graphite lg:pl-8',
              !margin && 'hidden lg:block',
            )}
          >
            {margin}
          </aside>
        )}
      </div>
    </div>
  )
}
