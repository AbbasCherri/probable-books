import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { cn } from '@/lib/cn'

// The rule down the left and the icon carry the tone; the words always say it too.
const TONES = {
  error: {
    role: 'alert',
    icon: CircleAlert,
    box: 'border-redpen-600 bg-redpen-50',
    mark: 'text-redpen-600',
  },
  info: { role: 'status', icon: Info, box: 'border-pen-600 bg-pen-50', mark: 'text-pen-600' },
  success: {
    role: 'status',
    icon: CircleCheck,
    box: 'border-ink-900 bg-paper-50',
    mark: 'text-ink-900',
  },
}

/**
 * A boxed message inside a page: a failed save, a heads-up, a done.
 *   <Alert tone="error" title="That didn't save">Check your connection and try again.</Alert>
 *   <Alert tone="success" action={<Button variant="link" as={Link} to="/dashboard">See your ledger</Button>}>
 *     Listed.
 *   </Alert>
 * tone: error (role="alert", read out at once), info (default) or success (role="status",
 * polite). Pass role={null} for a note that is there on load and should not be announced.
 */
export function Alert({ tone = 'info', title, action, role, className, children }) {
  const t = TONES[tone] ?? TONES.info
  const Icon = t.icon
  return (
    <div
      role={role === undefined ? t.role : (role ?? undefined)}
      className={cn(
        'flex items-start gap-3 rounded-paper border border-l-4 px-4 py-3 text-ink-900',
        t.box,
        className,
      )}
    >
      <Icon
        strokeWidth={1.5}
        aria-hidden="true"
        className={cn('mt-0.5 size-5 shrink-0', t.mark)}
      />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'text-ink-700')}>{children}</div>}
        {action && <div className="mt-2 flex flex-wrap gap-3">{action}</div>}
      </div>
    </div>
  )
}
