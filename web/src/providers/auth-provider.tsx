'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { signOut } from 'firebase/auth'
import { useQueryClient } from '@tanstack/react-query'
import { auth } from '@/lib/firebase'
import { api, setUnauthorizedHandler } from '@/lib/api'
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
  const queryClient = useQueryClient()

  const refresh = useCallback(async () => {
    await api.get<AppUser>('/auth/me')
      .then(({ data }) => setAppUser(data))
      .catch(() => setAppUser(null))
  }, [])

  // Register the global 401 handler — when any API call returns 401,
  // clear local state. The (app) layout redirects to /login when appUser is null.
  useEffect(() => {
    setUnauthorizedHandler(() => setAppUser(null))
    return () => setUnauthorizedHandler(() => {})
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {})
    await signOut(auth).catch(() => {})
    queryClient.clear()
    setAppUser(null)
  }, [queryClient])

  return (
    <AuthContext.Provider value={{ appUser, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
