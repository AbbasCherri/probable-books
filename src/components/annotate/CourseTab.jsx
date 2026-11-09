import { Link } from 'react-router'
import { cn } from '@/lib/cn'
import { codeToSlug, tabClassFor } from '@/lib/courses'

const SIZES = {
  md: 'h-7 px-2 text-small',
  lg: 'h-11 px-3 text-body',
}

/**
 * Index-tab chip for a course code, coloured by department (section 2).
 *   <CourseTab code="CHEM 201" />                  a label
 *   <CourseTab code="CHEM 201" asLink />           links to /courses/CHEM-201
 *   <CourseTab code="CHEM 201" asLink size="lg" /> a 44px chip, for a list of courses to pick
 * asLink keeps the 28px chip look inside a 44x44px link (section 3, Targets); the focus ring
 * and hover underline go on the chip. className goes on the outer element (the link, or the
 * chip when it is not a link).
 */
export function CourseTab({ code, asLink = false, size = 'md', className }) {
  const chip = cn(
    'inline-flex shrink-0 items-center rounded-t-paper border-b border-paper-400 font-condensed leading-none font-semibold whitespace-nowrap text-on-mark',
    SIZES[size] ?? SIZES.md,
    tabClassFor(code),
  )
  if (asLink) {
    return (
      <Link
        to={`/courses/${codeToSlug(code)}`}
        className={cn(
          'group/tab inline-flex min-h-11 min-w-11 items-center no-underline focus-visible:outline-none',
          className,
        )}
      >
        <span
          className={cn(
            chip,
            'group-hover/tab:underline',
            'group-focus-visible/tab:outline-2 group-focus-visible/tab:outline-offset-2 group-focus-visible/tab:outline-pen-600',
          )}
        >
          {code}
        </span>
      </Link>
    )
  }
  return <span className={cn(chip, className)}>{code}</span>
}
