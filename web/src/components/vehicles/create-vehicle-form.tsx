'use client'

import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useCreateVehicle } from '@/hooks/use-vehicles'
import { useCarMakes, useCarModels } from '@/hooks/use-car-ref'
import { Modal, Field, inputCls } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'

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
  onClose: () => void
  onSuccess: (vehicleId: string) => void
}

export function CreateVehicleForm({ onClose, onSuccess }: Props) {
  const t = useTranslations()
  const mutation = useCreateVehicle()
  const makes = useCarMakes()

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { year: new Date().getFullYear(), fuelType: 'PETROL' },
  })

  const makeValue = useWatch({ control, name: 'make' })
  const matchedMake = makes.data?.find((m) => m.name.toLowerCase() === makeValue?.toLowerCase())
  const models = useCarModels(matchedMake?.id ?? null)

  const makeOptions = makes.data?.map((m) => m.name) ?? []
  const modelOptions = models.data?.map((m) => m.name) ?? []

  function onSubmit(data: FormValues) {
    mutation.mutate(
      { ...data, vin: data.vin || undefined },
      { onSuccess: (vehicle) => onSuccess(vehicle.id) },
    )
  }

  return (
    <Modal onClose={onClose} title={t('vehicles.add')}>
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
                  placeholder="Toyota"
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
                  placeholder="Yaris"
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
            <input {...register('licensePlate')} className={inputCls} placeholder="ABC-12" />
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
          <input {...register('vin')} className={inputCls} placeholder="17 stafir" />
        </Field>

        {mutation.error && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            {(mutation.error as any)?.response?.data?.message ?? t('common.error')}
          </p>
        )}

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
