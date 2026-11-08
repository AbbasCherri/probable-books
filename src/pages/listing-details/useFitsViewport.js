import { useEffect, useState } from 'react'

/**
 * Pass the element itself (from a callback ref, so a late mount is seen).
 * True while the element (plus `margin` px) is no taller than the viewport. The sticky facts
 * panel only sticks when it fits; a taller one would hide its own lower half (the seller block)
 * until the end of the page.
 */
export function useFitsViewport(el, margin = 48) {
  const [fits, setFits] = useState(true)
  useEffect(() => {
    if (!el) return undefined
    const check = () => setFits(el.offsetHeight + margin <= window.innerHeight)
    check()
    const observer =
      typeof ResizeObserver === 'function' ? new ResizeObserver(check) : null
    observer?.observe(el)
    window.addEventListener('resize', check)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', check)
    }
  }, [el, margin])
  return fits
}
