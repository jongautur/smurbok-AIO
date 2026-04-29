'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { AppShell } from '@/components/layout/app-shell'
import { lp } from '@/lib/locale-path'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { appUser, loading } = useAuth()
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()

  useEffect(() => {
    if (!loading && !appUser) {
      router.replace(lp(locale, '/login'))
    }
  }, [appUser, loading, router, locale])

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--surface)' }}
      >
        <div
          className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (!appUser) return null

  return <AppShell>{children}</AppShell>
}
