'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useUpdateReminder, type Reminder } from '@/hooks/use-reminders'
import { useToast } from '@/providers/toast-provider'
import { Modal, Field, inputCls } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

const REMINDER_TYPES = [
  'OIL_CHANGE', 'INSPECTION', 'INSURANCE_RENEWAL', 'TAX_DUE', 'TIRE_CHANGE', 'OTHER',
] as const

const schema = z.object({
  type: z.enum(REMINDER_TYPES),
  dueDate: z.string().optional(),
  dueMileage: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().int().min(0).optional()),
  note: z.string().optional(),
  recurrenceMonths: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().int().min(1).max(60).optional()),
}).refine((d) => d.dueDate || d.dueMileage, {
  message: 'Set a due date or mileage',
  path: ['dueDate'],
})

type FormValues = z.infer<typeof schema>

interface Props {
  vehicleId: string
  reminder: Reminder
  onClose: () => void
  onSuccess: () => void
}

export function EditReminderForm({ vehicleId, reminder, onClose, onSuccess }: Props) {
  const t = useTranslations()
  const { toast } = useToast()
  const mutation = useUpdateReminder(vehicleId)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: reminder.type as typeof REMINDER_TYPES[number],
      dueDate: reminder.dueDate?.slice(0, 10) ?? '',
      dueMileage: reminder.dueMileage ?? undefined,
      note: reminder.note ?? '',
      recurrenceMonths: reminder.recurrenceMonths ?? undefined,
    },
  })

  return (
    <Modal onClose={onClose} title={t('reminders.edit')}>
      <form
        onSubmit={handleSubmit((d) =>
          mutation.mutate(
            { id: reminder.id, ...d, dueMileage: d.dueMileage ?? null, recurrenceMonths: d.recurrenceMonths ?? null },
            {
              onSuccess: () => { toast(t('common.saveSuccess')); onSuccess() },
              onError: () => toast(t('common.error'), 'error'),
            },
          )
        )}
        className="space-y-4"
      >
        <Field label={t('reminders.type')} error={errors.type?.message}>
          <select {...register('type')} className={inputCls}>
            {REMINDER_TYPES.map((type) => (
              <option key={type} value={type}>{t(`reminderType.${type}`)}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('reminders.dueDate')} error={errors.dueDate?.message}>
            <input type="date" {...register('dueDate')} className={inputCls} />
          </Field>
          <Field label={t('reminders.dueMileage')} error={errors.dueMileage?.message}>
            <input type="number" {...register('dueMileage')} className={inputCls} placeholder="km" />
          </Field>
        </div>

        <Field label={t('reminders.note')}>
          <input type="text" {...register('note')} className={inputCls} />
        </Field>

        <Field label={t('reminders.recurrenceMonths')} error={errors.recurrenceMonths?.message}>
          <input type="number" {...register('recurrenceMonths')} className={inputCls} placeholder={t('reminders.recurrenceMonthsPlaceholder')} min={1} max={60} />
        </Field>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" className="flex-1" disabled={mutation.isPending}>
            {mutation.isPending ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
