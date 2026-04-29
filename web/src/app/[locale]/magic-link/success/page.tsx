'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckCircle } from 'lucide-react'
import { lp } from '@/lib/locale-path'

export default function MagicLinkSuccessPage() {
  const t = useTranslations()
  const { locale } = useParams<{ locale: string }>()

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--surface)' }}
    >
      <div className="w-full max-w-sm text-center space-y-5">
        <div
          className="mx-auto w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
        >
          <CheckCircle size={28} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('auth.magicLinkSuccessTitle')}
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            {t('auth.magicLinkSuccessBody')}
          </p>
        </div>
        <Link
          href={lp(locale, '/vehicles')}
          className="inline-block text-sm font-medium px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          {t('auth.goToSmurbok')}
        </Link>
      </div>
    </div>
  )
}
