import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, getToken, setToken } from '@/lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    api.get('/api/auth/me')
      .then(data => setUser(data.user))
      .catch(err => {
        // Only clear token on real auth failures, not network errors
        if (err.status === 401) setToken(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username, password) => {
    try {
      const data = await api.post('/api/auth/login', { username, password })
      setToken(data.token)
      setUser(data.user)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.data?.error || e.message || 'Login failed' }
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
