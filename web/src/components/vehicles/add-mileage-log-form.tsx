'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useAddMileageLog } from '@/hooks/use-mileage-logs'
import { useToast } from '@/providers/toast-provider'
import { Modal, Field, inputCls } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

const schema = z.object({
  mileage: z.coerce.number().int().min(0),
  date: z.string().min(1),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  vehicleId: string
  onClose: () => void
  onSuccess: () => void
}

export function AddMileageLogForm({ vehicleId, onClose, onSuccess }: Props) {
  const t = useTranslations()
  const { toast } = useToast()
  const mutation = useAddMileageLog(vehicleId)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().split('T')[0] },
  })

  return (
    <Modal onClose={onClose} title={t('mileage.add')}>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d, {
        onSuccess: () => { toast(t('common.saveSuccess')); onSuccess() },
        onError: () => toast(t('common.error'), 'error'),
      }))} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('mileage.mileage')} error={errors.mileage?.message}>
            <input type="number" {...register('mileage')} className={inputCls} placeholder="0" />
          </Field>
          <Field label={t('mileage.date')} error={errors.date?.message}>
            <input type="date" {...register('date')} className={inputCls} />
          </Field>
        </div>

        <Field label={t('mileage.note')} error={errors.note?.message}>
          <input type="text" {...register('note')} className={inputCls} />
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
