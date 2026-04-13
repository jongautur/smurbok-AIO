'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useDeleteDocument, openDocument, type Document } from '@/hooks/use-documents'
import { useToast } from '@/providers/toast-provider'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'

interface Props {
  vehicleId: string
  documents: Document[]
}

export function DocumentList({ vehicleId, documents }: Props) {
  const t = useTranslations()

  if (documents.length === 0) {
    return <EmptyState icon="📄" message={t('documents.empty')} />
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
        className={`bg-white border rounded-lg px-4 py-3 ${
          isExpired
            ? 'border-red-300 bg-red-50'
            : expiresSoon
              ? 'border-amber-200 bg-amber-50'
              : 'border-gray-200'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-gray-900 truncate">{doc.label}</p>
              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded shrink-0">
                {t(`documentType.${doc.type}`)}
              </span>
              {isExpired && (
                <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                  {t('documents.expired')}
                </span>
              )}
              {expiresSoon && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                  {t('documents.expiresSoon')}
                </span>
              )}
            </div>
            {doc.expiresAt && (
              <p className="text-xs text-gray-500 mt-0.5">
                {t('documents.expiresAt')}: {new Date(doc.expiresAt).toLocaleDateString('is-IS')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleOpen(false)}
              disabled={loading !== null}
              className="text-xs text-blue-600 border border-blue-200 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50"
            >
              {loading === 'view' ? '...' : t('documents.view')}
            </button>
            <button
              onClick={() => handleOpen(true)}
              disabled={loading !== null}
              className="text-xs text-gray-600 border border-gray-200 bg-gray-50 px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              {loading === 'download' ? '...' : t('documents.download')}
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-gray-400 hover:text-red-500 px-2 py-1"
            >
              ✕
            </button>
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
