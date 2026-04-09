'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import type { ServiceRecord } from '@/types'

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
  onClose: () => void
  onSuccess: () => void
}

export function AddServiceRecordForm({ vehicleId, onClose, onSuccess }: Props) {
  const t = useTranslations()
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().split('T')[0] },
  })

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      api.post<ServiceRecord>(`/vehicles/${vehicleId}/service-records`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
      onSuccess()
    },
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">{t('serviceRecords.add')}</h2>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <Field label={t('serviceRecords.type')} error={errors.type?.message}>
            <select {...register('type')} className={inputCls}>
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`serviceType.${type}`)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t('serviceRecords.mileage')} error={errors.mileage?.message}>
            <input type="number" {...register('mileage')} className={inputCls} />
          </Field>

          <Field label={t('serviceRecords.date')} error={errors.date?.message}>
            <input type="date" {...register('date')} className={inputCls} />
          </Field>

          <Field label={t('serviceRecords.cost')} error={errors.cost?.message}>
            <input type="number" step="0.01" {...register('cost')} className={inputCls} />
          </Field>

          <Field label={t('serviceRecords.shop')} error={errors.shop?.message}>
            <input type="text" {...register('shop')} className={inputCls} />
          </Field>

          <Field label={t('serviceRecords.description')} error={errors.description?.message}>
            <textarea {...register('description')} rows={2} className={inputCls} />
          </Field>

          {mutation.error && (
            <p className="text-sm text-red-600">{t('common.error')}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-md py-2 text-sm">
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
