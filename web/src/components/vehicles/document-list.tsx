'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { FileText, Eye, Download, X } from 'lucide-react'
import { useDeleteDocument, openDocument, type Document } from '@/hooks/use-documents'
import { useToast } from '@/providers/toast-provider'
import { useDateLocale } from '@/hooks/use-date-locale'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Props {
  vehicleId: string
  documents: Document[]
}

export function DocumentList({ vehicleId, documents }: Props) {
  const t = useTranslations()

  if (documents.length === 0) {
    return <EmptyState icon={<FileText size={36} />} message={t('documents.empty')} />
  }

  return (
    <ul className="space-y-2">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} doc={doc} vehicleId={vehicleId} />
      ))}
    </ul>
  )
}

function DocumentCard({ doc, vehicleId }: { doc: Document; vehicleId: string }) {
  const t = useTranslations()
  const { toast } = useToast()
  const dateLocale = useDateLocale()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loading, setLoading] = useState<'view' | 'download' | null>(null)
  const deleteMutation = useDeleteDocument(vehicleId)

  const isExpired = doc.expiresAt && new Date(doc.expiresAt) < new Date()
  const expiresSoon =
    doc.expiresAt &&
    !isExpired &&
    new Date(doc.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  async function handleOpen(download: boolean) {
    setLoading(download ? 'download' : 'view')
    try {
      await openDocument(doc.id, download)
    } catch {
      toast(t('common.error'), 'error')
    } finally {
      setLoading(null)
    }
  }

  function handleDelete() {
    deleteMutation.mutate(doc.id, {
      onSuccess: () => {
        toast(t('common.deleteSuccess'))
        setConfirmDelete(false)
      },
    })
  }

  return (
    <>
      <li
        className="rounded-lg px-4 py-3 border"
        style={{
          backgroundColor: isExpired
            ? 'color-mix(in srgb, var(--danger) 6%, var(--surface-raised))'
            : expiresSoon
              ? 'color-mix(in srgb, #f59e0b 6%, var(--surface-raised))'
              : 'var(--surface-raised)',
          borderColor: isExpired
            ? 'color-mix(in srgb, var(--danger) 40%, transparent)'
            : expiresSoon
              ? 'color-mix(in srgb, #f59e0b 40%, transparent)'
              : 'var(--border)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{doc.label}</p>
              <Badge variant="muted">{t(`documentType.${doc.type}`)}</Badge>
              {isExpired && <Badge variant="danger">{t('documents.expired')}</Badge>}
              {expiresSoon && <Badge variant="warn">{t('documents.expiresSoon')}</Badge>}
            </div>
            {doc.expiresAt && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {t('documents.expiresAt')}: {new Date(doc.expiresAt).toLocaleDateString(dateLocale)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpen(false)}
              disabled={loading !== null}
              title={t('documents.view')}
            >
              {loading === 'view' ? '…' : <Eye size={14} />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpen(true)}
              disabled={loading !== null}
              title={t('documents.download')}
            >
              {loading === 'download' ? '…' : <Download size={14} />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              title={t('common.delete')}
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </Button>
          </div>
        </div>
      </li>
      {confirmDelete && (
        <ConfirmDialog
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          loading={deleteMutation.isPending}
        />
      )}
    </>
  )
}
