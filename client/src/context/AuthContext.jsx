import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth'
import { getCurrentUser, loginRequest } from '../services/authApi'

const STORAGE_KEY = 'mimici_auth_session'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved).token : null
    } catch {
      return null
    }
  })

  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved).user : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const hydrateSession = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const profile = await getCurrentUser(token)
        setUser(profile)
      } catch {
        setToken(null)
        setUser(null)
        sessionStorage.removeItem(STORAGE_KEY)
      } finally {
        setLoading(false)
      }
    }

    hydrateSession()
  }, [token])

  useEffect(() => {
    if (!token || !user) {
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }))
  }, [token, user])

  const login = async ({ nama_pengguna, kata_sandi }) => {
    const data = await loginRequest({ nama_pengguna, kata_sandi })
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    sessionStorage.removeItem(STORAGE_KEY)
  }

  const value = useMemo(
    () => ({ token, user, loading, login, logout }),
    [token, user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
