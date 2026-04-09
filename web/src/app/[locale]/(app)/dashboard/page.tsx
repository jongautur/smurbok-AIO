'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useDashboard } from '@/hooks/use-dashboard'
import { OverviewSkeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  const t = useTranslations()
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()
  const { data, isLoading, error } = useDashboard()

  if (isLoading) return <Shell><OverviewSkeleton /></Shell>
  if (error || !data) return <Shell><p className="text-sm text-red-500">{t('common.error')}</p></Shell>

  return (
    <Shell>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">{t('dashboard.title')}</h1>

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

      {/* Upcoming reminders */}
      <Section title={t('dashboard.upcomingReminders')}>
        {data.upcomingReminders.length === 0 ? (
          <p className="text-sm text-gray-400">{t('dashboard.noReminders')}</p>
        ) : (
          <ul className="space-y-2">
            {data.upcomingReminders.map((r) => (
              <li
                key={r.id}
                onClick={() => router.push(`/${locale}/vehicles/${r.vehicleId}`)}
                className={`bg-white border rounded-lg px-4 py-3 cursor-pointer hover:border-blue-400 transition-colors
                  ${r.isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {t(`reminderType.${r.type}`)}
                    </p>
                    <p className="text-xs text-gray-500">{r.vehicleName}</p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    {r.dueDate && <p>{new Date(r.dueDate).toLocaleDateString('is-IS')}</p>}
                    {r.dueMileage && <p>{r.dueMileage.toLocaleString()} km</p>}
                    {r.isOverdue && (
                      <span className="text-red-600 font-medium">{t('reminders.overdue')}</span>
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
          <p className="text-sm text-gray-400">{t('dashboard.noActivity')}</p>
        ) : (
          <ul className="space-y-2">
            {data.recentActivity.map((a) => (
              <li
                key={a.id}
                onClick={() => router.push(`/${locale}/vehicles/${a.vehicleId}`)}
                className="bg-white border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:border-blue-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      🔧 {t(`serviceType.${a.type}`)}
                    </p>
                    <p className="text-xs text-gray-500">{a.vehicleName}</p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>{new Date(a.date).toLocaleDateString('is-IS')}</p>
                    <p>{a.mileage.toLocaleString()} km</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">{children}</div>
    </div>
  )
}

function StatCard({
  value, label, highlight,
}: {
  value: number
  label: string
  highlight?: 'warn' | 'danger'
}) {
  const colors = highlight === 'danger'
    ? 'border-red-200 bg-red-50'
    : highlight === 'warn'
      ? 'border-amber-200 bg-amber-50'
      : 'border-gray-200 bg-white'

  return (
    <div className={`border rounded-lg px-4 py-3 text-center ${colors}`}>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{title}</p>
      {children}
    </div>
  )
}
