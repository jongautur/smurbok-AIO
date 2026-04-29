'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronRight, Check } from 'lucide-react'
import { inputCls } from '@/components/ui/modal'
import type { ExpenseCategory } from '@/types'

// Categories shown in the dropdown. TOLL is kept for legacy data but shown as Kílómetragjald.
// REPAIR and SERVICE are hidden from new entries (keep enum values for existing records).
const VISIBLE_CATEGORIES: ExpenseCategory[] = [
  'FUEL', 'THRIF', 'INSURANCE', 'TAX', 'PARKING', 'TOLL', 'OTHER',
]

interface Props {
  value: ExpenseCategory
  customValue: string
  onChange: (category: ExpenseCategory, custom: string) => void
}

export function ExpenseCategorySelector({ value, customValue, onChange }: Props) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setShowCustom(value === 'OTHER')
  }, [value])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function select(cat: ExpenseCategory) {
    onChange(cat, cat === 'OTHER' ? customValue : '')
    setOpen(false)
  }

  function getDisplayLabel(): string {
    if (value === 'OTHER' && customValue.trim()) return customValue.trim()
    return t(`expenseCategory.${value}`)
  }

  return (
    <div className="space-y-2">
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`${inputCls} w-full flex items-center justify-between gap-2 text-left`}
          style={{ color: 'var(--text-primary)' }}
        >
          <span>{getDisplayLabel()}</span>
          <ChevronRight
            size={14}
            className="shrink-0 transition-transform"
            style={{ transform: open ? 'rotate(90deg)' : undefined, color: 'var(--text-muted)' }}
          />
        </button>

        {open && (
          <div
            className="absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-lg z-50 py-1 overflow-hidden"
            style={{ backgroundColor: 'var(--surface-overlay)', borderColor: 'var(--border)' }}
          >
            {VISIBLE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => select(cat)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors hover:opacity-80"
                style={{ color: 'var(--text-primary)' }}
              >
                <span>{t(`expenseCategory.${cat}`)}</span>
                {value === cat && <Check size={14} style={{ color: 'var(--accent)' }} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {showCustom && (
        <input
          type="text"
          value={customValue}
          onChange={(e) => onChange('OTHER', e.target.value)}
          placeholder={t('expenses.customCategoryPlaceholder')}
          className={inputCls}
          maxLength={100}
          autoFocus
        />
      )}
    </div>
  )
}
