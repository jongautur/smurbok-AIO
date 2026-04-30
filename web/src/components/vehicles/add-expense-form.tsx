'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useAddExpense } from '@/hooks/use-vehicle'
import { useUploadDocument } from '@/hooks/use-documents'
import { useToast } from '@/providers/toast-provider'
import { useDateLocale } from '@/hooks/use-date-locale'
import { Modal, Field, inputCls } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { ExpenseCategorySelector } from './expense-category-selector'
import { DocumentLinkSelector } from './document-link-selector'
import type { ExpenseCategory } from '@/types'

const schema = z.object({
  amount: z.coerce.number().min(0),
  date: z.string().min(1),
  description: z.string().optional(),
  mileage: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().int().min(0).optional()),
  litres: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().min(0).optional()),
  recurringMonths: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().int().min(1).optional()),
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
  const dateLocale = useDateLocale()
  const mutation = useAddExpense(vehicleId)
  const uploadMutation = useUploadDocument(vehicleId)
  const fileRef = useRef<HTMLInputElement>(null)

  const [category, setCategory] = useState<ExpenseCategory>('FUEL')
  const [customCategory, setCustomCategory] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [documentIds, setDocumentIds] = useState<string[]>([])

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().split('T')[0] },
  })

  function onSubmit(d: FormValues) {
    mutation.mutate(
      {
        ...d,
        category,
        customCategory: category === 'OTHER' && customCategory.trim() ? customCategory.trim() : undefined,
        recurringMonths: recurring ? (d.recurringMonths ?? 1) : undefined,
        litres: category === 'FUEL' ? d.litres : undefined,
        documentIds,
      },
      {
        onSuccess: (expense) => {
          const file = fileRef.current?.files?.[0]
          if (file) {
            const label = `${category === 'OTHER' && customCategory.trim() ? customCategory.trim() : t(`expenseCategory.${category}`)} - ${new Date(d.date).toLocaleDateString(dateLocale)}`
            const formData = new FormData()
            formData.append('file', file)
            formData.append('type', 'RECEIPT')
            formData.append('label', label)
            formData.append('expenseId', expense.id)
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
      },
    )
  }

  return (
    <Modal onClose={onClose} title={t('expenses.add')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label={t('expenses.category')}>
          <ExpenseCategorySelector
            value={category}
            customValue={customCategory}
            onChange={(cat, custom) => { setCategory(cat); setCustomCategory(custom) }}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('expenses.amount')} error={errors.amount?.message}>
            <input type="number" step="0.01" {...register('amount')} className={inputCls} />
          </Field>
          <Field label={t('expenses.date')} error={errors.date?.message}>
            <input type="date" {...register('date')} className={inputCls} />
          </Field>
        </div>

        {category === 'FUEL' && (
          <Field label={t('expenses.litres')} error={errors.litres?.message}>
            <input type="number" step="0.01" {...register('litres')} placeholder={t('mileage.optional')} className={inputCls} />
          </Field>
        )}

        <Field label={t('mileage.current')} error={errors.mileage?.message}>
          <input type="number" {...register('mileage')} placeholder={t('mileage.optional')} className={inputCls} />
        </Field>

        <Field label={t('expenses.description')} error={errors.description?.message}>
          <input type="text" {...register('description')} className={inputCls} />
        </Field>

        {/* Recurring toggle */}
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('expenses.recurring')}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('expenses.recurringHint')}</p>
          </div>
          <button
            type="button"
            onClick={() => setRecurring((r) => !r)}
            className="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors"
            style={{ backgroundColor: recurring ? 'var(--accent)' : 'var(--border)' }}
            role="switch"
            aria-checked={recurring}
          >
            <span
              className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform"
              style={{ transform: recurring ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        {recurring && (
          <Field label={t('expenses.recurringMonths')} error={errors.recurringMonths?.message}>
            <input
              type="number"
              min={1}
              max={60}
              {...register('recurringMonths')}
              placeholder={t('expenses.recurringMonthsPlaceholder')}
              className={inputCls}
              defaultValue={1}
            />
          </Field>
        )}

        <Field label={t('documents.linkExisting')}>
          <DocumentLinkSelector vehicleId={vehicleId} selectedIds={documentIds} onChange={setDocumentIds} />
        </Field>

        <Field label={t('documents.attachFile')}>
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:text-sm"
            style={{ color: 'var(--text-muted)' }}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t('documents.fileHint')}</p>
        </Field>

        {mutation.error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{t('common.error')}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" className="flex-1" disabled={mutation.isPending || uploadMutation.isPending}>
            {(mutation.isPending || uploadMutation.isPending) ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
