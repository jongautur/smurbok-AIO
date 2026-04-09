'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useUpdateServiceRecord } from '@/hooks/use-vehicle'
import { useToast } from '@/providers/toast-provider'
import { Modal, Field, inputCls } from '@/components/ui/modal'
import type { ServiceType } from '@/types'

const SERVICE_TYPES = [
  'OIL_CHANGE', 'TIRE_ROTATION', 'TIRE_CHANGE', 'BRAKE_SERVICE',
  'FILTER_CHANGE', 'INSPECTION', 'TRANSMISSION_SERVICE', 'COOLANT_FLUSH',
  'BATTERY_REPLACEMENT', 'WINDSHIELD', 'OTHER',
] as const

const schema = z.object({
  type: z.enum(SERVICE_TYPES),
  mileage: z.coerce.number().int().min(0),
  date: z.string().min(1),
  cost: z.coerce.number().min(0).optional(),
  shop: z.string().optional(),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  vehicleId: string
  record: {
    id: string
    type: ServiceType
    mileage: number
    date: string
    cost: string | number | null
    shop: string | null
    description: string | null
  }
  onClose: () => void
  onSuccess: () => void
}

export function EditServiceRecordForm({ vehicleId, record, onClose, onSuccess }: Props) {
  const t = useTranslations()
  const { toast } = useToast()
  const mutation = useUpdateServiceRecord(vehicleId)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: record.type,
      mileage: record.mileage,
      date: record.date.slice(0, 10),
      cost: record.cost != null ? Number(record.cost) : undefined,
      shop: record.shop ?? '',
      description: record.description ?? '',
    },
  })

  return (
    <Modal onClose={onClose} title={t('serviceRecords.edit')}>
      <form onSubmit={handleSubmit((d) => mutation.mutate({ id: record.id, ...d }, {
        onSuccess: () => { toast(t('common.saveSuccess')); onSuccess() },
        onError: () => toast(t('common.error'), 'error'),
      }))} className="space-y-4">
        <Field label={t('serviceRecords.type')} error={errors.type?.message}>
          <select {...register('type')} className={inputCls}>
            {SERVICE_TYPES.map((type) => (
              <option key={type} value={type}>{t(`serviceType.${type}`)}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('serviceRecords.mileage')} error={errors.mileage?.message}>
            <input type="number" {...register('mileage')} className={inputCls} />
          </Field>
          <Field label={t('serviceRecords.date')} error={errors.date?.message}>
            <input type="date" {...register('date')} className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('serviceRecords.cost')} error={errors.cost?.message}>
            <input type="number" step="0.01" {...register('cost')} className={inputCls} />
          </Field>
          <Field label={t('serviceRecords.shop')} error={errors.shop?.message}>
            <input type="text" {...register('shop')} className={inputCls} />
          </Field>
        </div>

        <Field label={t('serviceRecords.description')} error={errors.description?.message}>
          <textarea {...register('description')} rows={2} className={inputCls} />
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
