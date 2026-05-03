'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useVehicleCostSummary } from '@/hooks/use-vehicle'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const MONTH_LABELS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_LABELS_IS = ['Ján', 'Feb', 'Mar', 'Apr', 'Maí', 'Jún', 'Júl', 'Ágú', 'Sep', 'Okt', 'Nóv', 'Des']

interface CostSummaryTabProps {
  vehicleId: string
  currency: string
  language: string
}

export function CostSummaryTab({ vehicleId, currency, language }: CostSummaryTabProps) {
  const t = useTranslations()
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const { data, isLoading } = useVehicleCostSummary(vehicleId, year)
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null)

  const monthLabels = language === 'is' ? MONTH_LABELS_IS : MONTH_LABELS_EN

  function prevYear() { setYear((y) => y - 1) }
  function nextYear() { if (year < currentYear) setYear((y) => y + 1) }

  return (
    <div className="space-y-4">
      {/* Year selector */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" size="sm" onClick={prevYear}>
          <ChevronLeft size={16} />
        </Button>
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          {t('vehicles.costYear')}: {year}
        </span>
        <Button variant="secondary" size="sm" onClick={nextYear} disabled={year >= currentYear}>
          <ChevronRight size={16} />
        </Button>
      </div>

      {isLoading && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
          {t('common.loading')}
        </p>
      )}

      {data && data.totalYear === 0 && (
        <Card>
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
            {t('vehicles.costNoData', { year })}
          </p>
        </Card>
      )}

      {data && data.totalYear > 0 && (
        <>
          {/* Total */}
          <Card>
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
              {t('vehicles.costTotal', { year })}
            </p>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {data.totalYear.toLocaleString()} {currency}
            </p>
          </Card>

          {/* Monthly bar chart */}
          <Card>
            <p className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
              {t('vehicles.costMonthlyTrend')}
            </p>
            <div className="relative">
              {(() => {
                const maxTotal = Math.max(...data.byMonth.map((m: any) => m.total), 1)
                return (
                  <div className="flex items-end gap-1 h-24">
                    {data.byMonth.map((m: any) => {
                      const heightPct = (m.total / maxTotal) * 100
                      const isHovered = hoveredMonth === m.month
                      return (
                        <div
                          key={m.month}
                          className="flex flex-col items-center flex-1 gap-1"
                          onMouseEnter={() => setHoveredMonth(m.month)}
                          onMouseLeave={() => setHoveredMonth(null)}
                          style={{ position: 'relative' }}
                        >
                          {isHovered && m.total > 0 && (
                            <div
                              className="absolute bottom-full mb-1 text-xs rounded px-1.5 py-0.5 whitespace-nowrap z-10"
                              style={{
                                backgroundColor: 'var(--surface-raised)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)',
                                transform: 'translateX(-50%)',
                                left: '50%',
                              }}
                            >
                              {m.total.toLocaleString()} {currency}
                            </div>
                          )}
                          <div className="w-full flex items-end" style={{ height: '88px' }}>
                            <div
                              className="w-full rounded-t transition-all"
                              style={{
                                height: `${Math.max(heightPct, m.total > 0 ? 4 : 0)}%`,
                                backgroundColor: isHovered ? 'var(--accent-hover, var(--accent))' : 'var(--accent)',
                                opacity: m.total === 0 ? 0.15 : 1,
                                minHeight: m.total > 0 ? '3px' : 0,
                              }}
                            />
                          </div>
                          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                            {monthLabels[m.month - 1]}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </Card>

          {/* By category */}
          <Card>
            <p className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
              {t('vehicles.costByCategory')}
            </p>
            <div className="space-y-2">
              {data.byCategory.map((row: any) => {
                const pct = data.totalYear > 0 ? Math.round((row.total / data.totalYear) * 100) : 0
                return (
                  <div key={row.category} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: 'var(--accent)' }}
                      />
                      <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {t(`expenseCategory.${row.category}` as any)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {t('vehicles.costOfTotal', { pct })}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {row.total.toLocaleString()} {currency}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
