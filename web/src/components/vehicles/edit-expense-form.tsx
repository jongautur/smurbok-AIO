'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useUpdateExpense } from '@/hooks/use-vehicle'
import { useToast } from '@/providers/toast-provider'
import { Modal, Field, inputCls } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { ExpenseCategorySelector } from './expense-category-selector'
import { DocumentLinkSelector } from './document-link-selector'
import type { Document, ExpenseCategory } from '@/types'

const schema = z.object({
  amount: z.coerce.number().min(0),
  date: z.string().min(1),
  description: z.string().optional(),
  litres: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().min(0).optional()),
  recurringMonths: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().int().min(1).optional()),
})

type FormValues = z.infer<typeof schema>

interface Props {
  vehicleId: string
  expense: {
    id: string
    category: ExpenseCategory
    amount: number | string
    date: string
    description: string | null
    litres: string | null
    customCategory: string | null
    recurringMonths: number | null
    documents: Document[]
  }
  onClose: () => void
  onSuccess: () => void
}

export function EditExpenseForm({ vehicleId, expense, onClose, onSuccess }: Props) {
  const t = useTranslations()
  const { toast } = useToast()
  const mutation = useUpdateExpense(vehicleId)

  const [category, setCategory] = useState<ExpenseCategory>(expense.category)
  const [customCategory, setCustomCategory] = useState(expense.customCategory ?? '')
  const [recurring, setRecurring] = useState(!!expense.recurringMonths)
  const [documentIds, setDocumentIds] = useState<string[]>(expense.documents.map((doc) => doc.id))

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: Number(expense.amount),
      date: expense.date.slice(0, 10),
      description: expense.description ?? '',
      litres: expense.litres ? Number(expense.litres) : undefined,
      recurringMonths: expense.recurringMonths ?? undefined,
    },
  })

  return (
    <Modal onClose={onClose} title={t('expenses.edit')}>
      <form
        onSubmit={handleSubmit((d) =>
          mutation.mutate(
            {
              id: expense.id,
              ...d,
              category,
              customCategory: category === 'OTHER' && customCategory.trim() ? customCategory.trim() : undefined,
              recurringMonths: recurring ? (d.recurringMonths ?? 1) : undefined,
              litres: category === 'FUEL' ? d.litres : undefined,
              documentIds,
            },
            {
              onSuccess: () => { toast(t('common.saveSuccess')); onSuccess() },
              onError: () => toast(t('common.error'), 'error'),
            },
          )
        )}
        className="space-y-4"
      >
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
            />
          </Field>
        )}

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
