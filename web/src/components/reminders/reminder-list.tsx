'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useUpdateReminder, useDeleteReminder, type Reminder } from '@/hooks/use-reminders'
import { useToast } from '@/providers/toast-provider'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'

interface Props {
  vehicleId: string
  reminders: Reminder[]
}

export function ReminderList({ vehicleId, reminders }: Props) {
  const t = useTranslations()
  const pending = reminders.filter((r) => r.status === 'PENDING')
  const done = reminders.filter((r) => r.status === 'DONE')

  if (reminders.length === 0) {
    return <EmptyState icon="🔔" message={t('reminders.empty')} />
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            {t('reminders.upcoming')}
          </p>
          <ul className="space-y-2">
            {pending.map((r) => (
              <ReminderCard key={r.id} reminder={r} vehicleId={vehicleId} />
            ))}
          </ul>
        </div>
      )}
      {done.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            {t('reminders.doneStatus')}
          </p>
          <ul className="space-y-2">
            {done.map((r) => (
              <ReminderCard key={r.id} reminder={r} vehicleId={vehicleId} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ReminderCard({ reminder, vehicleId }: { reminder: Reminder; vehicleId: string }) {
  const t = useTranslations()
  const { toast } = useToast()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const updateMutation = useUpdateReminder(vehicleId)
  const deleteMutation = useDeleteReminder(vehicleId)

  const isOverdue =
    reminder.status === 'PENDING' &&
    reminder.dueDate &&
    new Date(reminder.dueDate) < new Date()

  function markDone() {
    updateMutation.mutate(
      { id: reminder.id, status: 'DONE' },
      { onSuccess: () => toast(t('common.saveSuccess')) },
    )
  }

  function handleDelete() {
    deleteMutation.mutate(reminder.id, {
      onSuccess: () => {
        toast(t('common.deleteSuccess'))
        setConfirmDelete(false)
      },
    })
  }

  return (
    <>
      <li className={`bg-white border rounded-lg px-4 py-3 ${isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900">
                {t(`reminderType.${reminder.type}`)}
              </p>
              {isOverdue && (
                <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                  {t('reminders.overdue')}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-0.5 space-x-2">
              {reminder.dueDate && (
                <span>{new Date(reminder.dueDate).toLocaleDateString('is-IS')}</span>
              )}
              {reminder.dueMileage && (
                <span>{reminder.dueMileage.toLocaleString()} km</span>
              )}
              {reminder.note && <span>· {reminder.note}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {reminder.status === 'PENDING' && (
              <button
                onClick={markDone}
                disabled={updateMutation.isPending}
                className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded hover:bg-green-100"
              >
                ✓
              </button>
            )}
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
