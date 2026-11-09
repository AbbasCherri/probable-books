import { useRef } from 'react'
import { cn } from '@/lib/cn'

/**
 * WAI-ARIA tabs with automatic activation (section 4).
 * Left/Right move between tabs, Home/End jump to the ends. The parent keeps the
 * value in the URL (?tab=), so Back and shared links land on the same tab.
 * On phones the row scrolls sideways.
 */
export function Tabs({ label, tabs, value, onChange, idPrefix = 'tab' }) {
  const refs = useRef({})

  function onKeyDown(e, index) {
    let next = null
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    if (next === null) return
    e.preventDefault()
    const target = tabs[next]
    onChange(target.id)
    refs.current[target.id]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className="-mx-4 flex overflow-x-auto border-b border-paper-300 px-4 sm:mx-0 sm:px-0"
    >
      {tabs.map((tab, i) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              '-mb-px min-h-12 shrink-0 border-b-3 px-3.5 whitespace-nowrap transition-paper',
              selected
                ? 'border-ink-900 font-semibold text-ink-900'
                : 'border-transparent text-ink-500 hover:bg-paper-200 hover:text-ink-900',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({ id, idPrefix = 'tab', children }) {
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${id}`}
      aria-labelledby={`${idPrefix}-${id}`}
      tabIndex={0}
      className="pt-6"
    >
      {children}
    </div>
  )
}
