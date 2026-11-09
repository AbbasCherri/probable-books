import { cn } from '@/lib/cn'

const ALIGN = {
  start: 'left-0',
  end: 'right-0',
  stretch: 'inset-x-0',
}

/**
 * A paper surface that drops below its trigger: menus, listboxes, small popovers. Put it inside
 * a `relative` wrapper next to the trigger. It sits on the z-popover layer (see the z-index
 * scale in src/styles/index.css: popover < sticky < header < modal < toast).
 *   <div className="relative">
 *     <button aria-expanded={open} aria-controls="row-menu">Actions</button>
 *     <Popover open={open} id="row-menu" role="menu" align="end" className="w-56">...</Popover>
 *   </div>
 * Closed, it stays in the DOM with `hidden`, so aria-controls always points at something.
 * align: start (default, left edges), end (right edges), stretch (trigger width).
 * as: the element (div by default; ul for a listbox). Behaviour (Esc, outside click, focus) is
 * the caller's: this is only the surface.
 */
export function Popover({
  as: Component = 'div',
  open,
  align = 'start',
  className,
  ...props
}) {
  return (
    <Component
      hidden={!open}
      className={cn(
        'absolute top-full z-popover mt-1 rounded-paper border border-paper-400 bg-paper-50 shadow-stack',
        ALIGN[align] ?? ALIGN.start,
        className,
      )}
      {...props}
    />
  )
}
