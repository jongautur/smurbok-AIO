'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations()

  useEffect(() => {
    // Log to an error reporting service if one is configured
    console.error(error)
  }, [error])

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--surface)' }}
    >
      <div className="text-center space-y-4 max-w-sm">
        <div
          className="mx-auto w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)' }}
        >
          <AlertTriangle size={22} />
        </div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('common.error')}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {error.message || 'Something went wrong. Please try again.'}
        </p>
        <Button onClick={reset}>
          {t('common.tryAgain')}
        </Button>
      </div>
    </div>
  )
}
