import { cn } from '@/lib/cn'

// Full class names so Tailwind finds them (the hl utilities live in src/styles/index.css).
const COLORS = {
  yellow: 'hl-yellow',
  green: 'hl-green',
  blue: 'hl-blue',
  pink: 'hl-pink',
}

/**
 * A rough-edged highlighter swipe behind inline text (section 2).
 * Marks information only: search matches, key facts, selected filters. Never a headline word.
 *   <Highlight>CHEM 2</Highlight>01
 * `animate` draws it left to right (300ms); use it only in answer to an action, like a search running.
 */
export function Highlight({ color = 'yellow', animate = false, className, children }) {
  return (
    <mark
      className={cn(
        'hl px-0.5',
        COLORS[color] ?? COLORS.yellow,
        animate && 'motion-safe:animate-hl-draw',
        className,
      )}
    >
      {children}
    </mark>
  )
}
