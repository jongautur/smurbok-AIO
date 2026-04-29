'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Wrench, Car, Gauge } from 'lucide-react'
import { useDashboard } from '@/hooks/use-dashboard'
import { useAuth } from '@/providers/auth-provider'
import { useDateLocale } from '@/hooks/use-date-locale'
import { AddMileageLogForm } from '@/components/vehicles/add-mileage-log-form'
import { OverviewSkeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { lp } from '@/lib/locale-path'

export default function DashboardPage() {
  const t = useTranslations()
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()
  const { appUser } = useAuth()
  const { data, isLoading, error } = useDashboard()
  const [logMileageVehicleId, setLogMileageVehicleId] = useState<string | null>(null)
  const dateLocale = useDateLocale()

  if (isLoading) return <Page><OverviewSkeleton /></Page>
  if (error || !data) return <Page><p className="text-sm" style={{ color: 'var(--danger)' }}>{t('common.error')}</p></Page>

  return (
    <Page>
      <h1 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
        {t('dashboard.title')}
      </h1>

      {/* Counts */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard value={data.counts.vehicles} label={t('dashboard.vehicles')} />
        <StatCard value={data.counts.totalServiceRecords} label={t('dashboard.serviceRecords')} />
        <StatCard
          value={data.counts.pendingReminders}
          label={t('dashboard.pendingReminders')}
          highlight={data.counts.overdueReminders > 0 ? 'warn' : undefined}
        />
        <StatCard
          value={data.counts.overdueReminders}
          label={t('dashboard.overdue')}
          highlight={data.counts.overdueReminders > 0 ? 'danger' : undefined}
        />
      </div>

      {/* Vehicle strip */}
      <Section title={t('dashboard.yourVehicles')}>
        {data.vehicles.length === 0 ? (
          <EmptyState
            icon={<Car size={32} />}
            message={t('vehicles.empty')}
            action={
              <Button onClick={() => router.push(lp(locale, '/vehicles'))}>
                {t('vehicles.add')}
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.vehicles.map((v) => (
              <div
                key={v.id}
                onClick={() => router.push(lp(locale, `/vehicles/${v.id}`))}
                className="rounded-xl border p-3 cursor-pointer transition-colors hover:opacity-90"
                style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
              >
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {v.year} {v.make} {v.model}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {v.licensePlate}
                </p>
                {v.latestMileage != null && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {v.latestMileage.toLocaleString()} km
                  </p>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLogMileageVehicleId(v.id) }}
                  className="mt-2 flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--accent)' }}
                >
                  <Gauge size={12} /> {t('mileage.add')}
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Upcoming reminders */}
      <Section title={t('dashboard.upcomingReminders')}>
        {data.upcomingReminders.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('dashboard.noReminders')}</p>
        ) : (
          <ul className="space-y-2">
            {data.upcomingReminders.map((r) => (
              <li
                key={r.id}
                onClick={() => router.push(lp(locale, `/vehicles/${r.vehicleId}?tab=reminders`))}
                className="rounded-lg px-4 py-3 cursor-pointer border transition-colors"
                style={{
                  backgroundColor: r.isOverdue
                    ? 'color-mix(in srgb, var(--danger) 6%, var(--surface-raised))'
                    : 'var(--surface-raised)',
                  borderColor: r.isOverdue ? 'color-mix(in srgb, var(--danger) 40%, transparent)' : 'var(--border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {t(`reminderType.${r.type}`)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.vehicleName}</p>
                  </div>
                  <div className="text-right text-xs" style={{ color: 'var(--text-muted)' }}>
                    {r.dueDate && <p>{new Date(r.dueDate).toLocaleDateString(dateLocale)}</p>}
                    {r.dueMileage && <p>{r.dueMileage.toLocaleString()} km</p>}
                    {r.isOverdue && (
                      <Badge variant="danger">{t('reminders.overdue')}</Badge>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Recent activity */}
      <Section title={t('dashboard.recentActivity')}>
        {data.recentActivity.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('dashboard.noActivity')}</p>
        ) : (
          <ul className="space-y-2">
            {data.recentActivity.map((a) => (
              <li
                key={a.id}
                onClick={() => router.push(lp(locale, `/vehicles/${a.vehicleId}`))}
                className="rounded-lg px-4 py-3 cursor-pointer border transition-colors"
                style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                      <Wrench size={13} style={{ color: 'var(--text-muted)' }} />
                      {a.types.map((type: string) =>
                        type === 'OTHER' && a.customType ? a.customType : t(`serviceType.${type}`)
                      ).join(', ')}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.vehicleName}</p>
                  </div>
                  <div className="text-right text-xs" style={{ color: 'var(--text-muted)' }}>
                    <p>{new Date(a.date).toLocaleDateString(dateLocale)}</p>
                    <p>{a.mileage.toLocaleString()} km</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {logMileageVehicleId && (
        <AddMileageLogForm
          vehicleId={logMileageVehicleId}
          onClose={() => setLogMileageVehicleId(null)}
          onSuccess={() => setLogMileageVehicleId(null)}
        />
      )}
    </Page>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">{children}</div>
  )
}

function StatCard({
  value, label, highlight,
}: {
  value: number
  label: string
  highlight?: 'warn' | 'danger'
}) {
  return (
    <Card padding="sm" className="text-center"
      style={highlight === 'danger'
        ? { borderColor: 'color-mix(in srgb, var(--danger) 40%, transparent)', backgroundColor: 'color-mix(in srgb, var(--danger) 6%, var(--surface-raised))' }
        : highlight === 'warn'
          ? { borderColor: 'color-mix(in srgb, #f59e0b 40%, transparent)', backgroundColor: 'color-mix(in srgb, #f59e0b 6%, var(--surface-raised))' }
          : undefined}
    >
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </Card>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
        {title}
      </p>
      {children}
    </div>
  )
}
