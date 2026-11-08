import { useCallback, useState } from 'react'
import { THEME_KEY } from '@/lib/constants'

// 'system' | 'day' | 'night'. Saved under pb.theme; data-theme on <html> (section 10).
function read() {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'day' || v === 'night' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState(read)
  const setTheme = useCallback((next) => {
    setThemeState(next)
    try {
      if (next === 'system') {
        localStorage.removeItem(THEME_KEY)
        document.documentElement.removeAttribute('data-theme')
      } else {
        localStorage.setItem(THEME_KEY, next)
        document.documentElement.setAttribute('data-theme', next)
      }
    } catch {
      /* ignore */
    }
  }, [])
  return [theme, setTheme]
}
