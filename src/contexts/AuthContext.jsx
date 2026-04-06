import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const VALID_USER = { username: 'admin', password: 'admin123' }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('md-reader-auth')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('md-reader-auth')
      }
    }
  }, [])

  const login = (username, password) => {
    if (username === VALID_USER.username && password === VALID_USER.password) {
      const userData = { username }
      setUser(userData)
      localStorage.setItem('md-reader-auth', JSON.stringify(userData))
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('md-reader-auth')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
