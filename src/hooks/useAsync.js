import { useCallback, useEffect, useState } from 'react'

// useAsync(() => api.fn(), [deps]) -> { data, error, loading, retry }
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [tick, setTick] = useState(0)

  // New deps mean a new request: show loading now instead of the old result under the new inputs.
  const key = [...deps, tick]
  const [seen, setSeen] = useState(key)
  if (seen.length !== key.length || seen.some((d, i) => !Object.is(d, key[i]))) {
    setSeen(key)
    setState((s) => ({ ...s, loading: true, error: null }))
  }

  useEffect(() => {
    let cancelled = false
    fn()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState({ data: null, error, loading: false }))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const retry = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    setTick((t) => t + 1)
  }, [])
  return { ...state, retry }
}
