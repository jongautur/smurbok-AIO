'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useAddReminder } from '@/hooks/use-reminders'
import { useToast } from '@/providers/toast-provider'
import { Modal, Field, inputCls } from '@/components/ui/modal'

const REMINDER_TYPES = [
  'OIL_CHANGE', 'INSPECTION', 'INSURANCE_RENEWAL', 'TAX_DUE', 'TIRE_CHANGE', 'OTHER',
] as const

const schema = z.object({
  type: z.enum(REMINDER_TYPES),
  dueDate: z.string().optional(),
  dueMileage: z.coerce.number().int().min(0).optional().or(z.literal('')),
  note: z.string().optional(),
}).refine((d) => d.dueDate || d.dueMileage, {
  message: 'Settu inn gjalddaga eða kílómetra',
  path: ['dueDate'],
})

type FormValues = z.infer<typeof schema>

interface Props {
  vehicleId: string
  onClose: () => void
  onSuccess: () => void
}

export function AddReminderForm({ vehicleId, onClose, onSuccess }: Props) {
  const t = useTranslations()
  const { toast } = useToast()
  const mutation = useAddReminder(vehicleId)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'OIL_CHANGE' },
  })

  function onSubmit(data: FormValues) {
    mutation.mutate(
      { ...data, dueMileage: data.dueMileage ? Number(data.dueMileage) : undefined },
      {
        onSuccess: () => {
          toast(t('common.saveSuccess'))
          onSuccess()
        },
        onError: () => toast(t('common.error'), 'error'),
      },
    )
  }

  return (
    <Modal onClose={onClose} title={t('reminders.add')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        <Field label={t('reminders.note')} error={errors.note?.message}>
          <input type="text" {...register('note')} className={inputCls} />
        </Field>

        {mutation.error && <p className="text-sm text-red-600">{t('common.error')}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-300 rounded-md py-2 text-sm">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={mutation.isPending}
            className="flex-1 bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {mutation.isPending ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
