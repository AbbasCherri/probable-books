import { cn } from '@/lib/cn'

const COLORS = {
  yellow: 'var(--color-hl-yellow)',
  green: 'var(--color-hl-green)',
  blue: 'var(--color-hl-blue)',
  pink: 'var(--color-hl-pink)',
}

/**
 * A rough-edged highlighter swipe behind inline text (section 2).
 * Marks information only: search matches, key facts, selected filters. Never a headline word.
 *   <Highlight>CHEM 2</Highlight>01
 * `animate` draws it left to right (300ms); use it only in answer to an action, like a search running.
 */
export function Highlight({ color = 'yellow', animate = false, className, children }) {
  const fill = COLORS[color] ?? COLORS.yellow
  return (
    <mark
      className={cn(
        'rounded-[0.2em_0.5em_0.25em_0.45em] bg-transparent box-decoration-clone bg-no-repeat px-[0.12em] text-on-mark',
        animate && 'hl-draw',
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(${fill}, ${fill})`,
        backgroundSize: '100% 100%',
      }}
    >
      {children}
    </mark>
  )
}
