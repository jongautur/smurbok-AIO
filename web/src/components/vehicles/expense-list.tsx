'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Receipt, Pencil, X, RefreshCw } from 'lucide-react'
import { useDeleteExpense, useUndeleteExpense } from '@/hooks/use-vehicle'
import { useToast } from '@/providers/toast-provider'
import { useDateLocale } from '@/hooks/use-date-locale'
import { useAuth } from '@/providers/auth-provider'
import { EditExpenseForm } from './edit-expense-form'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import type { Expense } from '@/types'

interface Props {
  vehicleId: string
  expenses: Expense[]
}

export function ExpenseList({ vehicleId, expenses }: Props) {
  const t = useTranslations()

  if (expenses.length === 0) {
    return <EmptyState icon={<Receipt size={36} />} message={t('expenses.empty')} />
  }

  return (
    <ul className="space-y-2">
      {expenses.map((expense) => (
        <ExpenseCard key={expense.id} expense={expense} vehicleId={vehicleId} />
      ))}
    </ul>
  )
}

function ExpenseCard({ expense, vehicleId }: { expense: Expense; vehicleId: string }) {
  const t = useTranslations()
  const { toast } = useToast()
  const dateLocale = useDateLocale()
  const { appUser } = useAuth()
  const currency = appUser?.currency ?? 'kr'
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteMutation = useDeleteExpense(vehicleId)
  const undeleteMutation = useUndeleteExpense(vehicleId)

  function handleDelete() {
    deleteMutation.mutate(expense.id, {
      onSuccess: () => {
        setConfirmDelete(false)
        toast(t('common.deleteSuccess'), 'success', () => undeleteMutation.mutate(expense.id))
      },
      onError: () => toast(t('common.error'), 'error'),
    })
  }

  return (
    <>
      <li className="rounded-lg px-4 py-3 border" style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="muted">
                {expense.category === 'OTHER' && expense.customCategory
                  ? expense.customCategory
                  : t(`expenseCategory.${expense.category}`)}
              </Badge>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {Number(expense.amount).toLocaleString()} {currency}
              </p>
              {expense.recurringMonths != null && (
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
                  <RefreshCw size={11} />
                  {expense.recurringMonths === 1
                    ? t('expenses.recurringMonthly')
                    : t('expenses.recurringEvery', { months: expense.recurringMonths })}
                </span>
              )}
            </div>
            <div className="text-xs mt-0.5 space-x-2" style={{ color: 'var(--text-muted)' }}>
              <span>{new Date(expense.date).toLocaleDateString(dateLocale)}</span>
              {expense.mileage != null && <span>· {expense.mileage.toLocaleString()} km</span>}
              {expense.litres != null && <span>· {Number(expense.litres).toLocaleString()} L</span>}
              {expense.description && <span>· {expense.description}</span>}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              aria-label={t('common.edit')}
              title={t('common.edit')}
              className="p-1.5 rounded transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label={t('common.delete')}
              title={t('common.delete')}
              className="p-1.5 rounded transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </li>

      {editOpen && (
        <EditExpenseForm
          vehicleId={vehicleId}
          expense={{
            id: expense.id,
            category: expense.category,
            amount: expense.amount,
            date: expense.date,
            description: expense.description,
            litres: expense.litres,
            customCategory: expense.customCategory,
            recurringMonths: expense.recurringMonths,
          }}
          onClose={() => setEditOpen(false)}
          onSuccess={() => setEditOpen(false)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          loading={deleteMutation.isPending}
        />
      )}
    </>
  )
}
