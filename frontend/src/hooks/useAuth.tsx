import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authApi } from '../services/api'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  ready: boolean
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('attendance-user')
    return saved ? (JSON.parse(saved) as User) : null
  })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('attendance-token')
    if (!token) {
      setReady(true)
      return
    }
    authApi.me()
      .then((current) => {
        setUser(current)
        localStorage.setItem('attendance-user', JSON.stringify(current))
      })
      .catch(() => setUser(null))
      .finally(() => setReady(true))
  }, [])

  async function signIn(username: string, password: string) {
    const result = await authApi.login(username, password)
    localStorage.setItem('attendance-token', result.access_token)
    localStorage.setItem('attendance-user', JSON.stringify(result.user))
    setUser(result.user)
  }

  function signOut() {
    localStorage.removeItem('attendance-token')
    localStorage.removeItem('attendance-user')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, ready, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth ត្រូវប្រើនៅក្នុង AuthProvider')
  return context
}