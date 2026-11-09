import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { TextField } from '@/components/ui/TextField'
import { cn } from '@/lib/cn'
import { legendClass } from './filterStyles'

const DELAY = 300
const TICKS = Array.from({ length: 21 }, (_, i) => i)
const INVALID = 'border-b-redpen-600 bg-redpen-50'

const toText = (cents) =>
  cents === undefined || cents === null ? '' : String(cents / 100)
const toCents = (text) => {
  const n = Number.parseFloat(text)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined
}

/** Price range: dollars on screen, integer cents in props and in onChange. */
export function PriceFilter({ minPrice, maxPrice, onChange, className }) {
  const errorId = useId()
  const [minText, setMinText] = useState(toText(minPrice))
  const [maxText, setMaxText] = useState(toText(maxPrice))
  const latest = useRef({ minPrice, maxPrice, onChange })
  useEffect(() => {
    latest.current = { minPrice, maxPrice, onChange }
  })

  // Follow outside changes (Clear all, a chip) one field at a time, so a number still being typed
  // in the other box is never wiped when this one's value lands in the URL.
  const [seen, setSeen] = useState({ minPrice, maxPrice })
  if (seen.minPrice !== minPrice) {
    setSeen((s) => ({ ...s, minPrice }))
    if (toCents(minText) !== minPrice) setMinText(toText(minPrice))
  }
  if (seen.maxPrice !== maxPrice) {
    setSeen((s) => ({ ...s, maxPrice }))
    if (toCents(maxText) !== maxPrice) setMaxText(toText(maxPrice))
  }

  const lo = toCents(minText)
  const hi = toCents(maxText)
  const invalid = lo !== undefined && hi !== undefined && lo > hi

  useEffect(() => {
    if (invalid) return undefined
    if (lo === latest.current.minPrice && hi === latest.current.maxPrice) return undefined
    const timer = setTimeout(() => {
      latest.current.onChange?.({ minPrice: lo, maxPrice: hi })
    }, DELAY)
    return () => clearTimeout(timer)
  }, [lo, hi, invalid])

  const pending = useRef({ lo, hi, invalid })
  useEffect(() => {
    pending.current = { lo, hi, invalid }
  })
  const flush = useCallback(() => {
    const { lo: l, hi: h, invalid: bad } = pending.current
    const now = latest.current
    if (bad || (l === now.minPrice && h === now.maxPrice)) return
    now.onChange?.({ minPrice: l, maxPrice: h })
  }, [])
  // Leaving before the 300ms is up (sheet closed, rail swapped) must not lose the numbers.
  useEffect(() => flush, [flush])

  const shared = {
    onBlur: flush,
    type: 'number',
    inputMode: 'decimal',
    min: '0',
    step: '1',
    className: 'min-w-0 flex-1',
    inputClassName: invalid ? INVALID : undefined,
    'aria-invalid': invalid ? true : undefined,
    'aria-describedby': invalid ? errorId : undefined,
  }

  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className={legendClass}>Price</legend>
      <div
        aria-hidden="true"
        className="flex h-4 items-end justify-between border-b-2 border-ink-500"
      >
        {TICKS.map((i) => (
          <span key={i} className={cn('w-px bg-ink-500', i % 5 === 0 ? 'h-4' : 'h-2')} />
        ))}
      </div>
      <div className="mt-3 flex gap-3">
        <TextField
          {...shared}
          label="Lowest price"
          value={minText}
          onChange={(e) => setMinText(e.target.value)}
        />
        <TextField
          {...shared}
          label="Highest price"
          value={maxText}
          onChange={(e) => setMaxText(e.target.value)}
        />
      </div>
      {invalid && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 flex items-start gap-1.5 text-small text-redpen-600"
        >
          <CircleAlert
            strokeWidth={1.5}
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0"
          />
          <span>Lowest price is above highest price. Swap them.</span>
        </p>
      )}
    </fieldset>
  )
}
