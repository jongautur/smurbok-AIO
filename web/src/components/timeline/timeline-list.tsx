'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Wrench, Receipt, Gauge, ClipboardList, Pencil, X } from 'lucide-react'
import type { TimelineEntry } from '@/types'
import { EmptyState } from '@/components/ui/empty-state'
import { TimelineSkeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EditServiceRecordForm } from '@/components/vehicles/edit-service-record-form'
import { EditExpenseForm } from '@/components/vehicles/edit-expense-form'
import { useDeleteServiceRecord, useDeleteExpense } from '@/hooks/use-vehicle'
import { useDeleteMileageLog } from '@/hooks/use-mileage-logs'
import { useToast } from '@/providers/toast-provider'

const TYPE_ICON: Record<TimelineEntry['entryType'], React.ReactNode> = {
  SERVICE: <Wrench size={16} />,
  EXPENSE: <Receipt size={16} />,
  MILEAGE: <Gauge size={16} />,
}

function groupByDate(entries: TimelineEntry[]): [string, TimelineEntry[]][] {
  const groups = new Map<string, TimelineEntry[]>()
  for (const entry of entries) {
    const key = new Date(entry.date).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    })
    const group = groups.get(key) ?? []
    group.push(entry)
    groups.set(key, group)
  }
  return Array.from(groups.entries())
}

interface Props {
  entries: TimelineEntry[] | undefined
  isLoading: boolean
  vehicleId?: string
}

export function TimelineList({ entries, isLoading, vehicleId }: Props) {
  const t = useTranslations()

  if (isLoading) return <TimelineSkeleton />

  if (!entries?.length) {
    return <EmptyState icon={<ClipboardList size={36} />} message={t('common.noData')} />
  }

  const groups = groupByDate(entries)

  return (
    <div className="space-y-6">
      {groups.map(([date, groupEntries]) => (
        <div key={date}>
          <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
            {date}
          </p>
          <ul className="space-y-2">
            {groupEntries.map((entry) => (
              <TimelineCard key={entry.id} entry={entry} vehicleId={vehicleId} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function TimelineCard({ entry, vehicleId }: { entry: TimelineEntry; vehicleId?: string }) {
  const t = useTranslations()
  const { toast } = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const deleteServiceRecord = useDeleteServiceRecord(vehicleId ?? '')
  const deleteExpense = useDeleteExpense(vehicleId ?? '')
  const deleteMileageLog = useDeleteMileageLog(vehicleId ?? '')

  const canEdit = vehicleId && (entry.entryType === 'SERVICE' || entry.entryType === 'EXPENSE')
  const canDelete = vehicleId != null

  const title =
    entry.entryType === 'SERVICE'
      ? entry.types.map((type) =>
          type === 'OTHER' && entry.customType ? entry.customType : t(`serviceType.${type}`),
        ).join(', ')
      : entry.entryType === 'EXPENSE'
        ? entry.category === 'OTHER' && entry.customCategory
          ? entry.customCategory
          : t(`expenseCategory.${entry.category}`)
        : t('mileage.add')

  function handleDelete() {
    if (entry.entryType === 'SERVICE') {
      deleteServiceRecord.mutate(entry.id, {
        onSuccess: () => { toast(t('common.deleteSuccess')); setConfirmDelete(false) },
        onError: () => toast(t('common.error'), 'error'),
      })
    } else if (entry.entryType === 'EXPENSE') {
      deleteExpense.mutate(entry.id, {
        onSuccess: () => { toast(t('common.deleteSuccess')); setConfirmDelete(false) },
        onError: () => toast(t('common.error'), 'error'),
      })
    } else if (entry.entryType === 'MILEAGE') {
      deleteMileageLog.mutate(entry.id, {
        onSuccess: () => { toast(t('common.deleteSuccess')); setConfirmDelete(false) },
        onError: () => toast(t('common.error'), 'error'),
      })
    }
  }

  const isDeleting = deleteServiceRecord.isPending || deleteExpense.isPending || deleteMileageLog.isPending

  return (
    <>
      <li className="rounded-lg px-4 py-3 border" style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }}>
            {TYPE_ICON[entry.entryType]}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{title}</p>
              <div className="flex items-center gap-2 shrink-0">
                {entry.entryType === 'EXPENSE' && entry.amount && (
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {Number(entry.amount).toLocaleString()} kr
                  </p>
                )}
                {entry.entryType === 'SERVICE' && entry.cost && (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {Number(entry.cost).toLocaleString()} kr
                  </p>
                )}
                {canEdit && (
                  <button
                    onClick={() => setEditOpen(true)}
                    className="p-1 transition-opacity hover:opacity-70"
                    style={{ color: 'var(--text-muted)' }}
                    title={t('common.edit')}
                  >
                    <Pencil size={13} />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="p-1 transition-opacity hover:opacity-70"
                    style={{ color: 'var(--text-muted)' }}
                    title={t('common.delete')}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {'mileage' in entry && entry.mileage != null && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{entry.mileage.toLocaleString()} km</p>
              )}
              {entry.entryType === 'SERVICE' && entry.shop && (
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>· {entry.shop}</p>
              )}
              {'description' in entry && entry.description && (
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>· {entry.description}</p>
              )}
              {entry.entryType === 'MILEAGE' && entry.note && (
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>· {entry.note}</p>
              )}
            </div>
          </div>
        </div>
      </li>

      {editOpen && vehicleId && entry.entryType === 'SERVICE' && (
        <EditServiceRecordForm
          vehicleId={vehicleId}
          record={{
            id: entry.id,
            types: entry.types,
            customType: entry.customType,
            mileage: entry.mileage,
            date: entry.date,
            cost: entry.cost,
            shop: entry.shop,
            description: entry.description,
          }}
          onClose={() => setEditOpen(false)}
          onSuccess={() => setEditOpen(false)}
        />
      )}

      {editOpen && vehicleId && entry.entryType === 'EXPENSE' && (
        <EditExpenseForm
          vehicleId={vehicleId}
          expense={{
            id: entry.id,
            category: entry.category,
            amount: entry.amount ?? '0',
            date: entry.date,
            description: entry.description,
            litres: entry.litres ?? null,
            customCategory: entry.customCategory ?? null,
            recurringMonths: entry.recurringMonths,
          }}
          onClose={() => setEditOpen(false)}
          onSuccess={() => setEditOpen(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          loading={isDeleting}
        />
      )}
    </>
  )
}
