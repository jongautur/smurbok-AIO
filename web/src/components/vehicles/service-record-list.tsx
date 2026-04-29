'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Wrench, Pencil, X } from 'lucide-react'
import { useDeleteServiceRecord, useUndeleteServiceRecord } from '@/hooks/use-vehicle'
import { useToast } from '@/providers/toast-provider'
import { useDateLocale } from '@/hooks/use-date-locale'
import { EditServiceRecordForm } from './edit-service-record-form'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import type { ServiceRecord } from '@/types'

interface Props {
  vehicleId: string
  records: ServiceRecord[]
}

export function ServiceRecordList({ vehicleId, records }: Props) {
  const t = useTranslations()

  if (records.length === 0) {
    return <EmptyState icon={<Wrench size={36} />} message={t('serviceRecords.empty')} />
  }

  return (
    <ul className="space-y-2">
      {records.map((record) => (
        <ServiceRecordCard key={record.id} record={record} vehicleId={vehicleId} />
      ))}
    </ul>
  )
}

function ServiceRecordCard({ record, vehicleId }: { record: ServiceRecord; vehicleId: string }) {
  const t = useTranslations()
  const { toast } = useToast()
  const dateLocale = useDateLocale()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteMutation = useDeleteServiceRecord(vehicleId)
  const undeleteMutation = useUndeleteServiceRecord(vehicleId)

  function handleDelete() {
    deleteMutation.mutate(record.id, {
      onSuccess: () => {
        setConfirmDelete(false)
        toast(t('common.deleteSuccess'), 'success', () => undeleteMutation.mutate(record.id))
      },
      onError: () => toast(t('common.error'), 'error'),
    })
  }

  return (
    <>
      <li className="rounded-lg px-4 py-3 border" style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {record.types.map((type) =>
                type === 'OTHER' && record.customType
                  ? record.customType
                  : t(`serviceType.${type}`)
              ).join(', ')}
            </p>
            <div className="text-xs mt-0.5 space-x-2" style={{ color: 'var(--text-muted)' }}>
              <span>{new Date(record.date).toLocaleDateString(dateLocale)}</span>
              <span>· {record.mileage.toLocaleString()} km</span>
              {record.shop && <span>· {record.shop}</span>}
              {record.description && <span>· {record.description}</span>}
            </div>
            {record.cost && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {Number(record.cost).toLocaleString()} kr
              </p>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              aria-label={t('common.edit')}
              title={t('common.edit')}
              className="p-1.5 rounded transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label={t('common.delete')}
              title={t('common.delete')}
              className="p-1.5 rounded transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </li>

      {editOpen && (
        <EditServiceRecordForm
          vehicleId={vehicleId}
          record={{
            id: record.id,
            types: record.types,
            customType: record.customType,
            mileage: record.mileage,
            date: record.date,
            cost: record.cost,
            shop: record.shop,
            description: record.description,
          }}
          onClose={() => setEditOpen(false)}
          onSuccess={() => setEditOpen(false)}
        />
      )}
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
