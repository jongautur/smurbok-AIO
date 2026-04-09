'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useAddExpense } from '@/hooks/use-vehicle'
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

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().split('T')[0], category: 'FUEL' },
  })

  return (
    <Modal onClose={onClose} title={t('expenses.add')}>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d, {
        onSuccess: () => { toast(t('common.saveSuccess')); onSuccess() },
        onError: () => toast(t('common.error'), 'error'),
      }))} className="space-y-4">
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

        <Field label={t('expenses.description')} error={errors.description?.message}>
          <input type="text" {...register('description')} className={inputCls} />
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
