import { Link } from 'react-router'
import { cn } from '@/lib/cn'
import { codeToSlug, tabColorFor } from '@/lib/courses'

// Full class names so Tailwind finds them.
const TAB_CLASSES = {
  sage: 'bg-tab-sage',
  sky: 'bg-tab-sky',
  butter: 'bg-tab-butter',
  rose: 'bg-tab-rose',
  lilac: 'bg-tab-lilac',
  sand: 'bg-tab-sand',
}

/**
 * Index-tab chip for a course code, coloured by department (section 2).
 *   <CourseTab code="CHEM 201" />          a label
 *   <CourseTab code="CHEM 201" asLink />   links to /courses/CHEM-201
 */
export function CourseTab({ code, asLink = false, className }) {
  const classes = cn(
    'inline-flex h-7 shrink-0 items-center rounded-t-paper px-2 font-condensed text-sm leading-none font-semibold whitespace-nowrap text-on-mark',
    'border-b border-paper-400',
    TAB_CLASSES[tabColorFor(code)],
    asLink && 'no-underline hover:underline',
    className,
  )
  if (asLink) {
    return (
      <Link to={`/courses/${codeToSlug(code)}`} className={classes}>
        {code}
      </Link>
    )
  }
  return <span className={classes}>{code}</span>
}
