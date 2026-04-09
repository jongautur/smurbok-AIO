'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { TimelineEntry, ServiceType, ExpenseCategory } from '@/types'
import { EmptyState } from '@/components/ui/empty-state'
import { TimelineSkeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EditServiceRecordForm } from '@/components/vehicles/edit-service-record-form'
import { EditExpenseForm } from '@/components/vehicles/edit-expense-form'
import { useDeleteServiceRecord, useDeleteExpense } from '@/hooks/use-vehicle'
import { useDeleteMileageLog } from '@/hooks/use-mileage-logs'
import { useToast } from '@/providers/toast-provider'

const TYPE_ICON: Record<TimelineEntry['type'], string> = {
  service_record: '🔧',
  expense: '💰',
  mileage_log: '📍',
}

function groupByDate(entries: TimelineEntry[]): [string, TimelineEntry[]][] {
  const groups = new Map<string, TimelineEntry[]>()
  for (const entry of entries) {
    const key = new Date(entry.date).toLocaleDateString('is-IS', {
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
    return <EmptyState icon="📋" message={t('common.noData')} />
  }

  const groups = groupByDate(entries)

  return (
    <div className="space-y-6">
      {groups.map(([date, groupEntries]) => (
        <div key={date}>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
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

  const canEdit = vehicleId && (entry.type === 'service_record' || entry.type === 'expense')
  const canDelete = vehicleId != null

  const title =
    entry.type === 'service_record'
      ? t(`serviceType.${entry.title}`)
      : entry.type === 'expense'
        ? t(`expenseCategory.${entry.title}`)
        : t('mileage.add')

  const meta = entry.meta as Record<string, string | null>

  function handleDelete() {
    if (entry.type === 'service_record') {
      deleteServiceRecord.mutate(entry.id, {
        onSuccess: () => { toast(t('common.deleteSuccess')); setConfirmDelete(false) },
        onError: () => toast(t('common.error'), 'error'),
      })
    } else if (entry.type === 'expense') {
      deleteExpense.mutate(entry.id, {
        onSuccess: () => { toast(t('common.deleteSuccess')); setConfirmDelete(false) },
        onError: () => toast(t('common.error'), 'error'),
      })
    } else if (entry.type === 'mileage_log') {
      deleteMileageLog.mutate(entry.id, {
        onSuccess: () => { toast(t('common.deleteSuccess')); setConfirmDelete(false) },
        onError: () => toast(t('common.error'), 'error'),
      })
    }
  }

  const isDeleting = deleteServiceRecord.isPending || deleteExpense.isPending || deleteMileageLog.isPending

  return (
    <>
      <li className="bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">{TYPE_ICON[entry.type]}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
              <div className="flex items-center gap-2 shrink-0">
                {entry.type === 'expense' && meta.amount && (
                  <p className="text-sm font-semibold text-gray-700">
                    {Number(meta.amount).toLocaleString('is-IS')} kr
                  </p>
                )}
                {entry.type === 'service_record' && meta.cost && (
                  <p className="text-sm text-gray-500">
                    {Number(meta.cost).toLocaleString('is-IS')} kr
                  </p>
                )}
                {canEdit && (
                  <button
                    onClick={() => setEditOpen(true)}
                    className="text-xs text-gray-400 hover:text-blue-500 px-1.5 py-1"
                    title={t('common.edit')}
                  >
                    ✎
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-xs text-gray-400 hover:text-red-500 px-1.5 py-1"
                    title={t('common.delete')}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {entry.mileage != null && (
                <p className="text-xs text-gray-400">{entry.mileage.toLocaleString()} km</p>
              )}
              {entry.type === 'service_record' && meta.shop && (
                <p className="text-xs text-gray-400 truncate">· {meta.shop}</p>
              )}
              {meta.description && (
                <p className="text-xs text-gray-400 truncate">· {meta.description}</p>
              )}
            </div>
          </div>
        </div>
      </li>

      {editOpen && vehicleId && entry.type === 'service_record' && (
        <EditServiceRecordForm
          vehicleId={vehicleId}
          record={{
            id: entry.id,
            type: entry.title as ServiceType,
            mileage: entry.mileage ?? 0,
            date: entry.date,
            cost: meta.cost,
            shop: meta.shop,
            description: meta.description,
          }}
          onClose={() => setEditOpen(false)}
          onSuccess={() => setEditOpen(false)}
        />
      )}

      {editOpen && vehicleId && entry.type === 'expense' && (
        <EditExpenseForm
          vehicleId={vehicleId}
          expense={{
            id: entry.id,
            category: entry.title as ExpenseCategory,
            amount: meta.amount ?? '0',
            date: entry.date,
            description: meta.description,
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
