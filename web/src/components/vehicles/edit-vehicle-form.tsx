'use client'

import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useUpdateVehicle } from '@/hooks/use-vehicles'
import { useCarMakes, useCarModels } from '@/hooks/use-car-ref'
import { useToast } from '@/providers/toast-provider'
import { Modal, Field, inputCls } from '@/components/ui/modal'
import { Combobox } from '@/components/ui/combobox'
import type { VehicleOverview } from '@/types'

const FUEL_TYPES = ['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID', 'PLUG_IN_HYBRID', 'HYDROGEN'] as const

const schema = z.object({
  make: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  year: z.coerce.number().int().min(1886).max(new Date().getFullYear() + 1),
  licensePlate: z.string().min(1).max(20),
  vin: z.string().length(17).optional().or(z.literal('')),
  color: z.string().optional(),
  fuelType: z.enum(FUEL_TYPES).optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  vehicle: VehicleOverview
  onClose: () => void
  onSuccess: () => void
}

export function EditVehicleForm({ vehicle, onClose, onSuccess }: Props) {
  const t = useTranslations()
  const { toast } = useToast()
  const mutation = useUpdateVehicle(vehicle.id)
  const makes = useCarMakes()

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      licensePlate: vehicle.licensePlate,
      vin: vehicle.vin ?? '',
      color: vehicle.color ?? '',
      fuelType: vehicle.fuelType as (typeof FUEL_TYPES)[number],
    },
  })

  const makeValue = useWatch({ control, name: 'make' })
  const matchedMake = makes.data?.find((m) => m.name.toLowerCase() === makeValue?.toLowerCase())
  const models = useCarModels(matchedMake?.id ?? null)

  const makeOptions = makes.data?.map((m) => m.name) ?? []
  const modelOptions = models.data?.map((m) => m.name) ?? []

  function onSubmit(data: FormValues) {
    const payload = { ...data, vin: data.vin || undefined, color: data.color || undefined }
    mutation.mutate(payload, {
      onSuccess: () => { toast(t('common.saveSuccess')); onSuccess() },
      onError: () => toast(t('common.error'), 'error'),
    })
  }

  return (
    <Modal onClose={onClose} title={t('vehicles.edit')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('vehicles.make')} error={errors.make?.message}>
            <Controller
              control={control}
              name="make"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  options={makeOptions}
                />
              )}
            />
          </Field>
          <Field label={t('vehicles.model')} error={errors.model?.message}>
            <Controller
              control={control}
              name="model"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  options={modelOptions}
                />
              )}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('vehicles.year')} error={errors.year?.message}>
            <input type="number" {...register('year')} className={inputCls} />
          </Field>
          <Field label={t('vehicles.licensePlate')} error={errors.licensePlate?.message}>
            <input {...register('licensePlate')} className={inputCls} />
          </Field>
        </div>

        <Field label={t('vehicles.fuelType')} error={errors.fuelType?.message}>
          <select {...register('fuelType')} className={inputCls}>
            {FUEL_TYPES.map((f) => (
              <option key={f} value={f}>{t(`fuelType.${f}`)}</option>
            ))}
          </select>
        </Field>

        <Field label={t('vehicles.color')} error={errors.color?.message}>
          <input {...register('color')} className={inputCls} />
        </Field>

        <Field label={t('vehicles.vin')} error={errors.vin?.message}>
          <input {...register('vin')} className={inputCls} />
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
