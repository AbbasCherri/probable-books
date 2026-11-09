import { Link } from 'react-router'
import { pageTitleClass } from '@/components/layout/pageTitle'
import { cn } from '@/lib/cn'
import { Button } from './Button'

/**
 * Something failed to load: say so plainly and offer a way forward (section 9).
 *
 *   Whole page (the page's one h1, inside its PageShell):
 *   <ErrorState variant="page" title="This page didn't print."
 *     note="Something jammed on our end. Try again in a moment."
 *     onRetry={retry} secondary={{ to: '/browse', label: 'Browse listings' }} />
 *
 *   One section of a page (an alert box with an h2, or `as="h3"` deeper down):
 *   <ErrorState variant="inline" title="Couldn't load the index"
 *     note="Check your connection and try again." onRetry={retry} />
 *
 * onRetry shows a Retry button (retryLabel to rename it); secondary adds a link ({ to, label }).
 * The note is announced (role="alert").
 */
export function ErrorState({
  variant = 'inline',
  title,
  note,
  onRetry,
  retryLabel = 'Retry',
  secondary,
  as: Heading = 'h2',
  className,
}) {
  if (variant === 'page') {
    return (
      <div className={cn('mt-8 max-w-xl sm:mt-12', className)}>
        <h1 className={pageTitleClass}>{title}</h1>
        {note && (
          <p role="alert" className="mt-4 text-ink-700">
            {note}
          </p>
        )}
        <Actions onRetry={onRetry} retryLabel={retryLabel} secondary={secondary} page />
      </div>
    )
  }

  return (
    <div
      role="alert"
      className={cn(
        'max-w-lg rounded-paper border border-redpen-600 bg-paper-50 px-6 py-5',
        className,
      )}
    >
      <Heading className="font-sans text-h3 font-semibold text-ink-900">{title}</Heading>
      {note && <p className="mt-1 text-ink-700">{note}</p>}
      <Actions onRetry={onRetry} retryLabel={retryLabel} secondary={secondary} />
    </div>
  )
}

function Actions({ onRetry, retryLabel, secondary, page = false }) {
  if (!onRetry && !secondary) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-3', page ? 'mt-6' : 'mt-4')}>
      {onRetry && (
        <Button variant={page ? 'ink' : 'outline'} onClick={() => onRetry()}>
          {retryLabel}
        </Button>
      )}
      {secondary && (
        <Button
          as={Link}
          to={secondary.to}
          variant={page ? 'outline' : 'link'}
        >
          {secondary.label}
        </Button>
      )}
    </div>
  )
}
