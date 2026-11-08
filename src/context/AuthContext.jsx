import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import * as api from '@/services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    api
      .getCurrentUser()
      .then((u) => alive && setUser(u))
      .finally(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const u = await api.login(email, password)
    setUser(u)
    return u
  }, [])
  const register = useCallback(async (data) => {
    const u = await api.register(data)
    setUser(u)
    return u
  }, [])
  const logout = useCallback(async () => {
    await api.logout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, ready, login, register, logout }),
    [user, ready, login, register, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
