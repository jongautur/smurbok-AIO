'use client'

import { Download, Eye, FileText } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { openDocument } from '@/hooks/use-documents'
import { useToast } from '@/providers/toast-provider'
import type { Document } from '@/types'

interface Props {
  documents: Document[]
}

export function LinkedDocuments({ documents }: Props) {
  const t = useTranslations()
  const { toast } = useToast()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  if (documents.length === 0) return null

  async function handleOpen(id: string, download: boolean) {
    setLoadingId(id)
    try {
      await openDocument(id, download)
    } catch {
      toast(t('common.error'), 'error')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {documents.map((doc) => (
        <span
          key={doc.id}
          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
          style={{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--text-muted)',
          }}
        >
          <FileText size={12} />
          <span className="max-w-32 truncate">{doc.label}</span>
          <button
            type="button"
            onClick={() => handleOpen(doc.id, false)}
            disabled={loadingId !== null}
            aria-label={t('documents.view')}
            title={t('documents.view')}
            className="transition-opacity hover:opacity-70 disabled:opacity-50"
            style={{ color: 'var(--accent)' }}
          >
            <Eye size={12} />
          </button>
          <button
            type="button"
            onClick={() => handleOpen(doc.id, true)}
            disabled={loadingId !== null}
            aria-label={t('documents.download')}
            title={t('documents.download')}
            className="transition-opacity hover:opacity-70 disabled:opacity-50"
            style={{ color: 'var(--accent)' }}
          >
            <Download size={12} />
          </button>
        </span>
      ))}
    </div>
  )
}
