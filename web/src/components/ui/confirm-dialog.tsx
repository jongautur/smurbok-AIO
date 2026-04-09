'use client'

import { useTranslations } from 'next-intl'

interface Props {
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmDialog({ onConfirm, onCancel, loading }: Props) {
  const t = useTranslations('common')

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <p className="text-sm text-gray-700 mb-6">{t('confirmDelete')}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-300 rounded-md py-2 text-sm"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-600 text-white rounded-md py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? t('loading') : t('delete')}
          </button>
        </div>
      </div>
    </div>
  )
}
