'use client'

import { FileText } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useDocuments } from '@/hooks/use-documents'

interface Props {
  vehicleId: string
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function DocumentLinkSelector({ vehicleId, selectedIds, onChange }: Props) {
  const t = useTranslations()
  const { data: documents, isLoading } = useDocuments(vehicleId)

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id],
    )
  }

  const available = documents?.filter(
    (doc) =>
      selectedIds.includes(doc.id) ||
      (doc.serviceRecordId === null && doc.expenseId === null),
  )

  if (isLoading) {
    return (
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {t('common.loading')}
      </p>
    )
  }

  if (!available?.length) {
    return (
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {t('documents.noExisting')}
      </p>
    )
  }

  return (
    <div className="max-h-32 overflow-y-auto rounded-md border" style={{ borderColor: 'var(--border)' }}>
      {available.map((doc) => (
        <label
          key={doc.id}
          className="flex items-center gap-2 px-3 py-2 text-sm border-b last:border-b-0 cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(doc.id)}
            onChange={() => toggle(doc.id)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          <FileText size={14} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
          <span className="min-w-0 truncate">{doc.label}</span>
        </label>
      ))}
    </div>
  )
}
