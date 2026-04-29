'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Gauge, X } from 'lucide-react'
import { useDeleteMileageLog, useUndeleteMileageLog } from '@/hooks/use-mileage-logs'
import { useToast } from '@/providers/toast-provider'
import { useDateLocale } from '@/hooks/use-date-locale'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import type { MileageLog } from '@/types'

interface Props {
  vehicleId: string
  logs: MileageLog[]
}

export function MileageLogList({ vehicleId, logs }: Props) {
  const t = useTranslations()

  if (logs.length === 0) {
    return <EmptyState icon={<Gauge size={36} />} message={t('mileage.empty')} />
  }

  return (
    <ul className="space-y-2">
      {logs.map((log) => (
        <MileageCard key={log.id} log={log} vehicleId={vehicleId} />
      ))}
    </ul>
  )
}

function MileageCard({ log, vehicleId }: { log: MileageLog; vehicleId: string }) {
  const t = useTranslations()
  const { toast } = useToast()
  const dateLocale = useDateLocale()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteMutation = useDeleteMileageLog(vehicleId)
  const undeleteMutation = useUndeleteMileageLog(vehicleId)

  function handleDelete() {
    deleteMutation.mutate(log.id, {
      onSuccess: () => {
        setConfirmDelete(false)
        toast(t('common.deleteSuccess'), 'success', () => undeleteMutation.mutate(log.id))
      },
      onError: () => toast(t('common.error'), 'error'),
    })
  }

  return (
    <>
      <li className="rounded-lg px-4 py-3 border" style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {log.mileage.toLocaleString()} km
            </p>
            <div className="text-xs mt-0.5 space-x-2" style={{ color: 'var(--text-muted)' }}>
              <span>{new Date(log.date).toLocaleDateString(dateLocale)}</span>
              {log.note && <span>· {log.note}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label={t('common.delete')}
            title={t('common.delete')}
            className="p-1.5 rounded transition-opacity hover:opacity-70 shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={14} />
          </button>
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
