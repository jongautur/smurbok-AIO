'use client'

import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useAddExpense } from '@/hooks/use-vehicle'
import { useUploadDocument } from '@/hooks/use-documents'
import { useToast } from '@/providers/toast-provider'
import { Modal, Field, inputCls } from '@/components/ui/modal'

const EXPENSE_CATEGORIES = [
  'FUEL', 'SERVICE', 'INSURANCE', 'TAX', 'PARKING', 'TOLL', 'REPAIR', 'OTHER',
] as const

const schema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.coerce.number().min(0),
  date: z.string().min(1),
  description: z.string().optional(),
  mileage: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().int().min(0).optional()),
})

type FormValues = z.infer<typeof schema>

interface Props {
  vehicleId: string
  onClose: () => void
  onSuccess: () => void
}

export function AddExpenseForm({ vehicleId, onClose, onSuccess }: Props) {
  const t = useTranslations()
  const { toast } = useToast()
  const mutation = useAddExpense(vehicleId)
  const uploadMutation = useUploadDocument(vehicleId)
  const fileRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().split('T')[0], category: 'FUEL' },
  })

  function onSubmit(d: FormValues) {
    mutation.mutate(d, {
      onSuccess: () => {
        const file = fileRef.current?.files?.[0]
        if (file) {
          const label = `${t(`expenseCategory.${d.category}`)} - ${new Date(d.date).toLocaleDateString('is-IS')}`
          const formData = new FormData()
          formData.append('file', file)
          formData.append('type', 'RECEIPT')
          formData.append('label', label)
          uploadMutation.mutate(formData, {
            onSuccess: () => { toast(t('common.saveSuccess')); onSuccess() },
            onError: () => { toast(t('common.saveSuccess')); onSuccess() },
          })
        } else {
          toast(t('common.saveSuccess'))
          onSuccess()
        }
      },
      onError: () => toast(t('common.error'), 'error'),
    })
  }

  return (
    <Modal onClose={onClose} title={t('expenses.add')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label={t('expenses.category')} error={errors.category?.message}>
          <select {...register('category')} className={inputCls}>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{t(`expenseCategory.${cat}`)}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('expenses.amount')} error={errors.amount?.message}>
            <input type="number" step="0.01" {...register('amount')} className={inputCls} />
          </Field>
          <Field label={t('expenses.date')} error={errors.date?.message}>
            <input type="date" {...register('date')} className={inputCls} />
          </Field>
        </div>

        <Field label={t('mileage.current')} error={errors.mileage?.message}>
          <input type="number" {...register('mileage')} placeholder={t('mileage.optional')} className={inputCls} />
        </Field>

        <Field label={t('expenses.description')} error={errors.description?.message}>
          <input type="text" {...register('description')} className={inputCls} />
        </Field>

        <Field label={t('documents.attachFile')}>
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-gray-300 file:text-sm file:bg-white hover:file:bg-gray-50"
          />
          <p className="text-xs text-gray-400 mt-1">{t('documents.fileHint')}</p>
        </Field>

        {mutation.error && <p className="text-sm text-red-600">{t('common.error')}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-300 rounded-md py-2 text-sm">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={mutation.isPending || uploadMutation.isPending}
            className="flex-1 bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {(mutation.isPending || uploadMutation.isPending) ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
