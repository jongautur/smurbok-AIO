'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { onIdTokenChanged, User as FirebaseUser } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { api } from '@/lib/api'
import type { AppUser } from '@/types'

interface AuthContext {
  firebaseUser: FirebaseUser | null
  appUser: AppUser | null
  loading: boolean
}

const AuthContext = createContext<AuthContext>({
  firebaseUser: null,
  appUser: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Safety net: never stay loading more than 8 seconds regardless of what Firebase does
    const safetyTimer = setTimeout(() => setLoading(false), 8000)

    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      clearTimeout(safetyTimer)
      setFirebaseUser(user)

      if (user) {
        try {
          const { data } = await api.get<AppUser>('/auth/me')
          setAppUser(data)
        } catch {
          setAppUser(null)
        }
      } else {
        setAppUser(null)
      }

      setLoading(false)
    })

    return () => { unsubscribe(); clearTimeout(safetyTimer) }
  }, [])

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
