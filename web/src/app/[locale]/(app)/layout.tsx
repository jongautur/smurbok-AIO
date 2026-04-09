'use client'

import { useEffect } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { signOut } from 'firebase/auth'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/providers/auth-provider'
import { auth } from '@/lib/firebase'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth()
  const router = useRouter()
  const params = useParams<{ locale: string }>()
  const pathname = usePathname()
  const t = useTranslations('common')

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace(`/${params.locale}/login`)
    }
  }, [firebaseUser, loading, router, params.locale])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        {t('loading')}
      </div>
    )
  }

  if (!firebaseUser) return null

  const locale = params.locale

  const navItems = [
    { href: `/${locale}/dashboard`, label: '⊞', title: 'Dashboard' },
    { href: `/${locale}/vehicles`, label: '🚗', title: 'Vehicles' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {children}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around px-4 py-2 z-40">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-6 py-1 rounded-lg transition-colors ${
                active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-xl">{item.label}</span>
              <span className="text-xs">{item.title}</span>
            </Link>
          )
        })}
        <button
          onClick={() => signOut(auth).then(() => router.replace(`/${locale}/login`))}
          className="flex flex-col items-center gap-0.5 px-6 py-1 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span className="text-xl">↩</span>
          <span className="text-xs">{t('logout')}</span>
        </button>
      </nav>
    </div>
  )
}
