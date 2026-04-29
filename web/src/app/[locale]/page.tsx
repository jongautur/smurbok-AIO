'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Wrench, Bell, FileText } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { lp } from '@/lib/locale-path'

const FEATURES = [
  { icon: Wrench, titleKey: 'home.feature1Title', bodyKey: 'home.feature1Body' },
  { icon: Bell,   titleKey: 'home.feature2Title', bodyKey: 'home.feature2Body' },
  { icon: FileText, titleKey: 'home.feature3Title', bodyKey: 'home.feature3Body' },
] as const

export default function HomePage() {
  const t = useTranslations()
  const { appUser, loading } = useAuth()
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()

  useEffect(() => {
    if (!loading && appUser) {
      router.replace(lp(locale, '/vehicles'))
    }
  }, [loading, appUser, router, locale])

  if (loading || appUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--surface)' }}>
        <div
          className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--surface)' }}>
      {/* Nav */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-raised)' }}
      >
        <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Smurbók
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={locale === 'is' ? '/en' : '/'}
            className="text-sm px-2 py-1 rounded transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            {locale === 'is' ? 'EN' : 'IS'}
          </Link>
          <Link href={lp(locale, '/login')}>
            <Button size="sm" variant="ghost" style={{ color: 'var(--accent)' }}>
              {t('home.signIn')}
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-20 text-center space-y-6">
        <h1
          className="text-4xl font-bold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {t('home.heroTitle')}
        </h1>
        <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
          {t('home.heroBody')}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href={lp(locale, '/login')}>
            <Button size="md" className="px-8 py-3 text-base">
              {t('home.getStarted')}
            </Button>
          </Link>
          <Link href={lp(locale, '/demo')}>
            <Button size="md" variant="secondary" className="px-8 py-3 text-base">
              {t('home.tryDemo')}
            </Button>
          </Link>
        </div>
      </main>

      {/* Features */}
      <section className="max-w-2xl mx-auto w-full px-6 pb-20 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
        {FEATURES.map(({ icon: Icon, titleKey, bodyKey }) => (
          <div key={titleKey} className="space-y-3">
            <div
              className="mx-auto w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)' }}
            >
              <Icon size={20} />
            </div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t(titleKey)}
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {t(bodyKey)}
            </p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer
        className="border-t px-6 py-6 text-center text-xs space-x-4"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      >
        <Link href={lp(locale, '/terms')} className="hover:underline">
          {t('auth.terms')}
        </Link>
        <Link href={lp(locale, '/privacy')} className="hover:underline">
          {t('auth.privacy')}
        </Link>
        <span>© {new Date().getFullYear()} Smurbók</span>
      </footer>
    </div>
  )
}
