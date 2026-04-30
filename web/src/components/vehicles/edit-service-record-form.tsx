'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useUpdateServiceRecord } from '@/hooks/use-vehicle'
import { useToast } from '@/providers/toast-provider'
import { Modal, Field, inputCls } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { ServiceTypeSelector, type ServiceEntry } from './service-type-selector'
import { DocumentLinkSelector } from './document-link-selector'
import type { ServiceRecord } from '@/types'

const INSPECTION_TYPES = ['INSPECTION', 'MAIN_INSPECTION', 'RE_INSPECTION']
const INSPECTION_STATIONS = ['Aðalskoðun', 'Frumherji', 'Betri skoðun', 'Tékkland']

const schema = z.object({
  mileage: z.coerce.number().int().min(0),
  date: z.string().min(1),
  cost: z.coerce.number().min(0).optional(),
  shop: z.string().optional(),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  vehicleId: string
  record: Pick<ServiceRecord, 'id' | 'types' | 'customType' | 'mileage' | 'date' | 'cost' | 'shop' | 'description' | 'documents'>
  onClose: () => void
  onSuccess: () => void
}

export function EditServiceRecordForm({ vehicleId, record, onClose, onSuccess }: Props) {
  const t = useTranslations()
  const { toast } = useToast()
  const mutation = useUpdateServiceRecord(vehicleId)

  const initialServices: ServiceEntry[] = record.types.map((type) =>
    type === 'OTHER' && record.customType ? { type, customName: record.customType } : { type }
  )

  const [services, setServices] = useState<ServiceEntry[]>(initialServices)
  const [documentIds, setDocumentIds] = useState<string[]>(record.documents.map((doc) => doc.id))
  const [servicesError, setServicesError] = useState<string | undefined>()
  const [stationError, setStationError] = useState<string | undefined>()

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      mileage: record.mileage,
      date: record.date.slice(0, 10),
      cost: record.cost != null ? Number(record.cost) : undefined,
      shop: record.shop ?? '',
      description: record.description ?? '',
    },
  })

  const hasInspection = services.some((s) => INSPECTION_TYPES.includes(s.type))
  const shopValue = watch('shop')

  function onSubmit(d: FormValues) {
    if (services.length === 0) {
      setServicesError(t('serviceRecords.selectTypes'))
      return
    }
    setServicesError(undefined)

    if (hasInspection && !d.shop) {
      setStationError(t('serviceRecords.inspectionStation'))
      return
    }
    setStationError(undefined)

    const types = services.map((s) => s.type)
    const customType = services.find((s) => s.type === 'OTHER')?.customName

    mutation.mutate({ id: record.id, types, customType, documentIds, ...d }, {
      onSuccess: () => { toast(t('common.saveSuccess')); onSuccess() },
      onError: () => toast(t('common.error'), 'error'),
    })
  }

  return (
    <Modal onClose={onClose} title={t('serviceRecords.edit')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <p className="text-sm mb-1.5 font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('serviceRecords.type')}
          </p>
          <ServiceTypeSelector value={services} onChange={(s) => { setServices(s); setServicesError(undefined) }} error={servicesError} />
        </div>

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

          {hasInspection ? (
            <Field label={t('serviceRecords.inspectionStation')} error={stationError}>
              <select
                value={shopValue ?? ''}
                onChange={(e) => { setValue('shop', e.target.value); setStationError(undefined) }}
                className={inputCls}
              >
                <option value="" disabled>{t('serviceRecords.inspectionStationPlaceholder')}</option>
                {INSPECTION_STATIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label={t('serviceRecords.shop')} error={errors.shop?.message}>
              <input type="text" {...register('shop')} className={inputCls} />
            </Field>
          )}
        </div>

        <Field label={t('serviceRecords.description')} error={errors.description?.message}>
          <textarea {...register('description')} rows={2} className={inputCls} />
        </Field>

        <Field label={t('documents.linkExisting')}>
          <DocumentLinkSelector vehicleId={vehicleId} selectedIds={documentIds} onChange={setDocumentIds} />
        </Field>

        {mutation.error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{t('common.error')}</p>}

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
