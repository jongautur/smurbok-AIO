'use client'

import { useTranslations } from 'next-intl'
import { Button } from './button'

interface Props {
  message?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmDialog({ message, onConfirm, onCancel, loading }: Props) {
  const t = useTranslations('common')

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-sm shadow-xl border"
        style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
      >
        <p className="text-sm mb-6" style={{ color: 'var(--text-primary)' }}>{message ?? t('confirmDelete')}</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button variant="destructive" className="flex-1" onClick={onConfirm} disabled={loading}>
            {loading ? t('loading') : t('delete')}
          </Button>
        </div>
      </div>
    </div>
  )
}
