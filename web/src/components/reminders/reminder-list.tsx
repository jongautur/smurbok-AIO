'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, Check, X, Pencil, Clock } from 'lucide-react'
import { useUpdateReminder, useDeleteReminder, useUndeleteReminder, useSnoozeReminder, type Reminder } from '@/hooks/use-reminders'
import { useToast } from '@/providers/toast-provider'
import { useDateLocale } from '@/hooks/use-date-locale'
import { EditReminderForm } from './edit-reminder-form'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal, Field, inputCls } from '@/components/ui/modal'

interface Props {
  vehicleId: string
  reminders: Reminder[]
}

export function ReminderList({ vehicleId, reminders }: Props) {
  const t = useTranslations()
  const pending = reminders.filter((r) => r.status === 'PENDING' || r.status === 'SNOOZED')
  const done = reminders.filter((r) => r.status === 'DONE')

  if (reminders.length === 0) {
    return <EmptyState icon={<Bell size={36} />} message={t('reminders.empty')} />
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
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
          <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
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
  const dateLocale = useDateLocale()
  const [editOpen, setEditOpen] = useState(false)
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const updateMutation = useUpdateReminder(vehicleId)
  const deleteMutation = useDeleteReminder(vehicleId)
  const undeleteMutation = useUndeleteReminder(vehicleId)

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
        setConfirmDelete(false)
        toast(t('common.deleteSuccess'), 'success', () => undeleteMutation.mutate(reminder.id))
      },
      onError: () => toast(t('common.error'), 'error'),
    })
  }

  return (
    <>
      <li
        className="rounded-lg px-4 py-3 border"
        style={{
          backgroundColor: isOverdue
            ? 'color-mix(in srgb, var(--danger) 6%, var(--surface-raised))'
            : 'var(--surface-raised)',
          borderColor: isOverdue
            ? 'color-mix(in srgb, var(--danger) 40%, transparent)'
            : 'var(--border)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {t(`reminderType.${reminder.type}`)}
              </p>
              {isOverdue && <Badge variant="danger">{t('reminders.overdue')}</Badge>}
              {reminder.status === 'SNOOZED' && <Badge variant="muted">{t('reminders.snoozed')}</Badge>}
            </div>
            <div className="text-xs mt-0.5 space-x-2" style={{ color: 'var(--text-muted)' }}>
              {reminder.dueDate && (
                <span>{new Date(reminder.dueDate).toLocaleDateString(dateLocale)}</span>
              )}
              {reminder.dueMileage && (
                <span>{reminder.dueMileage.toLocaleString()} km</span>
              )}
              {reminder.note && <span>· {reminder.note}</span>}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {reminder.status !== 'DONE' && (
              <>
                <IconBtn onClick={markDone} label={t('reminders.markDone')} disabled={updateMutation.isPending}>
                  <Check size={14} style={{ color: '#059669' }} />
                </IconBtn>
                <IconBtn onClick={() => setSnoozeOpen(true)} label={t('reminders.snooze')}>
                  <Clock size={14} />
                </IconBtn>
              </>
            )}
            <IconBtn onClick={() => setEditOpen(true)} label={t('common.edit')}>
              <Pencil size={13} />
            </IconBtn>
            <IconBtn onClick={() => setConfirmDelete(true)} label={t('common.delete')}>
              <X size={14} />
            </IconBtn>
          </div>
        </div>
      </li>

      {editOpen && (
        <EditReminderForm
          vehicleId={vehicleId}
          reminder={reminder}
          onClose={() => setEditOpen(false)}
          onSuccess={() => setEditOpen(false)}
        />
      )}
      {snoozeOpen && (
        <SnoozeModal
          reminderId={reminder.id}
          vehicleId={vehicleId}
          onClose={() => setSnoozeOpen(false)}
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

function SnoozeModal({ reminderId, vehicleId, onClose }: { reminderId: string; vehicleId: string; onClose: () => void }) {
  const t = useTranslations()
  const { toast } = useToast()
  const mutation = useSnoozeReminder(vehicleId)
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  const [date, setDate] = useState(tomorrow)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate({ id: reminderId, date }, {
      onSuccess: () => { toast(t('common.saveSuccess')); onClose() },
      onError: () => toast(t('common.error'), 'error'),
    })
  }

  return (
    <Modal onClose={onClose} title={t('reminders.snoozeTitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t('reminders.snoozeDate')}>
          <input
            type="date"
            value={date}
            min={tomorrow}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
        </Field>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" className="flex-1" disabled={mutation.isPending}>
            {mutation.isPending ? t('common.loading') : t('reminders.snooze')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function IconBtn({ children, onClick, label, disabled = false }: {
  children: React.ReactNode
  onClick: () => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="p-1.5 rounded transition-opacity hover:opacity-70 disabled:opacity-40"
      style={{ color: 'var(--text-muted)' }}
    >
      {children}
    </button>
  )
}
