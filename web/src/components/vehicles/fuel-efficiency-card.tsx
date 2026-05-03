'use client'

import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'

interface FuelEfficiencyData {
  kmPerLitre: number | null
  litresPer100km: number | null
  totalKm: number | null
  totalLitres: number | null
  dataPoints: number
  insufficientData: boolean
}

interface FuelEfficiencyCardProps {
  data: FuelEfficiencyData | undefined
  fuelType: string
}

export function FuelEfficiencyCard({ data, fuelType }: FuelEfficiencyCardProps) {
  const t = useTranslations('vehicles')

  if (fuelType === 'ELECTRIC') return null
  if (!data) return null

  return (
    <Card>
      <p className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
        {t('fuelEfficiency')}
      </p>
      {data.insufficientData ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('fuelEfficiencyHint')}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--overlay)' }}>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {data.litresPer100km?.toFixed(1)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t('litresPer100km')}</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--overlay)' }}>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {data.kmPerLitre?.toFixed(1)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t('kmPerLitre')}</p>
            </div>
          </div>
          {data.dataPoints > 0 && data.totalKm != null && (
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              {t('fuelFillUps', { count: data.dataPoints, km: data.totalKm.toLocaleString() })}
            </p>
          )}
        </>
      )}
    </Card>
  )
}
