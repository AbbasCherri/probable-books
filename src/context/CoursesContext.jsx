import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as api from '@/services/api'

const CoursesContext = createContext(null)

/**
 * The course index for shared components (components never fetch, section 7): the header's
 * course lookup reads it from here. Mounted in RootLayout. Nothing loads until a consumer asks;
 * the API keeps the list in memory, so asking again (opening the lookup again) is instant.
 */
export function CoursesProvider({ children }) {
  const [state, setState] = useState({ courses: null, loading: false, error: null })
  const inFlight = useRef(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const load = useCallback(() => {
    if (inFlight.current) return inFlight.current
    setState((s) => ({ ...s, loading: true, error: null }))
    inFlight.current = api
      .getCourses()
      .then(
        (courses) => alive.current && setState({ courses, loading: false, error: null }),
        (error) => alive.current && setState((s) => ({ ...s, loading: false, error })),
      )
      .finally(() => {
        inFlight.current = null
      })
    return inFlight.current
  }, [])

  const value = useMemo(() => ({ ...state, load }), [state, load])
  return <CoursesContext.Provider value={value}>{children}</CoursesContext.Provider>
}

/**
 * const { courses, loading, error, retry } = useCourses(enabled)
 *   courses  [{ code, title, listingCount, ... }] or null until loaded
 *   enabled  load (or refresh) when true; pass the open state of whatever shows them
 */
export function useCourses(enabled = true) {
  const ctx = useContext(CoursesContext)
  if (!ctx) throw new Error('useCourses must be used inside CoursesProvider')
  const { load } = ctx
  useEffect(() => {
    if (enabled) load()
  }, [enabled, load])
  return { courses: ctx.courses, loading: ctx.loading, error: ctx.error, retry: load }
}
