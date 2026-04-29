'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'

export default function LocaleNotFound() {
  const t = useTranslations()
  const locale = useLocale()

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--surface)' }}
    >
      <div className="text-center space-y-4">
        <p
          className="text-7xl font-bold"
          style={{ color: 'color-mix(in srgb, var(--accent) 30%, var(--border))' }}
        >
          404
        </p>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('notFound.title')}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('notFound.body')}
        </p>
        <Link
          href={`/${locale}`}
          className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          {t('notFound.home')}
        </Link>
      </div>
    </div>
  )
}
