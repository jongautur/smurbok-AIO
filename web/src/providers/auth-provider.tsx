'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { api } from '@/lib/api'
import type { AppUser } from '@/types'

interface AuthContext {
  appUser: AppUser | null
  loading: boolean
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContext>({
  appUser: null,
  loading: true,
  logout: async () => {},
  refresh: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    await api.get<AppUser>('/auth/me')
      .then(({ data }) => setAppUser(data))
      .catch(() => setAppUser(null))
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {})
    await signOut(auth).catch(() => {})
    setAppUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ appUser, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
