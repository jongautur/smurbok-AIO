'use client'

import { useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Wrench, Receipt, Gauge, Bell, ArrowLeft, Pencil } from 'lucide-react'
import { useVehicleOverview, useVehicleTimeline, useServiceRecords, useExpenses } from '@/hooks/use-vehicle'
import { useReminders } from '@/hooks/use-reminders'
import { useMileageLogs } from '@/hooks/use-mileage-logs'
import { useToast } from '@/providers/toast-provider'
import { AddServiceRecordForm } from '@/components/vehicles/add-service-record-form'
import { AddExpenseForm } from '@/components/vehicles/add-expense-form'
import { EditVehicleForm } from '@/components/vehicles/edit-vehicle-form'
import { AddMileageLogForm } from '@/components/vehicles/add-mileage-log-form'
import { AddReminderForm } from '@/components/reminders/add-reminder-form'
import { ReminderList } from '@/components/reminders/reminder-list'
import { ServiceRecordList } from '@/components/vehicles/service-record-list'
import { ExpenseList } from '@/components/vehicles/expense-list'
import { MileageLogList } from '@/components/vehicles/mileage-log-list'
import { TimelineList } from '@/components/timeline/timeline-list'
import { UploadDocumentForm } from '@/components/vehicles/upload-document-form'
import { DocumentList } from '@/components/vehicles/document-list'
import { useDocuments } from '@/hooks/use-documents'
import { OverviewSkeleton, ListSkeleton } from '@/components/ui/skeleton'
import { useDateLocale } from '@/hooks/use-date-locale'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { lp } from '@/lib/locale-path'

type Tab = 'overview' | 'service' | 'expenses' | 'mileage' | 'reminders' | 'documents' | 'timeline'
type Modal = 'service' | 'expense' | 'reminder' | 'mileage' | 'edit_vehicle' | 'document' | null

const VALID_TABS: Tab[] = ['overview', 'service', 'expenses', 'mileage', 'reminders', 'documents', 'timeline']

export default function VehiclePage() {
  const { id, locale } = useParams<{ id: string; locale: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations()
  const { toast } = useToast()
  const dateLocale = useDateLocale()

  const [tab, setTab] = useState<Tab>(() => {
    const p = searchParams.get('tab') as Tab | null
    return p && VALID_TABS.includes(p) ? p : 'overview'
  })
  const [modal, setModal] = useState<Modal>(null)

  const overview = useVehicleOverview(id)
  const timeline = useVehicleTimeline(id, tab === 'timeline')
  const reminders = useReminders(id)
  const documents = useDocuments(id)
  const serviceRecords = useServiceRecords(id)
  const expenses = useExpenses(id)
  const mileageLogs = useMileageLogs(id)

  const overdueCount = reminders.data?.filter(
    (r) => r.status === 'PENDING' && r.dueDate && new Date(r.dueDate) < new Date(),
  ).length ?? 0

  if (overview.isLoading) return <Page><OverviewSkeleton /></Page>
  if (overview.error || !overview.data) {
    return <Page><p className="text-sm" style={{ color: 'var(--danger)' }}>{t('common.error')}</p></Page>
  }

  const v = overview.data

  function onFormSuccess(msg?: string) {
    setModal(null)
    if (msg) toast(msg)
  }

  const tabs: { key: Tab; label: React.ReactNode }[] = [
    { key: 'overview',   label: t('vehicles.overview') },
    { key: 'service',    label: t('serviceRecords.title') },
    { key: 'expenses',   label: t('expenses.title') },
    { key: 'mileage',    label: t('mileage.title') },
    { key: 'reminders',  label: (
      <span className="flex items-center gap-1.5">
        {t('reminders.title')}
        {overdueCount > 0 && <Badge variant="danger">{overdueCount}</Badge>}
      </span>
    )},
    { key: 'documents',  label: t('documents.title') },
    { key: 'timeline',   label: t('vehicles.timeline') },
  ]

  return (
    <Page>
      <button
        onClick={() => router.push(lp(locale, '/vehicles'))}
        className="flex items-center gap-1 text-sm mb-4 transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-muted)' }}
      >
        <ArrowLeft size={14} /> {t('common.back')}
      </button>

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {v.year} {v.make} {v.model}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{v.licensePlate}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setModal('edit_vehicle')}>
          <Pencil size={13} /> {t('common.edit')}
        </Button>
      </div>

      {/* Scrollable tab bar */}
      <div
        className="flex gap-1 border-b mb-6 overflow-x-auto"
        style={{ borderColor: 'var(--border)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="pb-2 px-1 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0"
            style={{
              borderColor: tab === key ? 'var(--accent)' : 'transparent',
              color: tab === key ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label={t('vehicles.mileage')}>
              {v.latestMileage != null ? `${v.latestMileage.toLocaleString()} km` : '—'}
            </Stat>
            <Stat label={t('vehicles.estimatedMileage')}>
              {v.estimatedMileage != null
                ? `~${v.estimatedMileage.toLocaleString()} km${v.estimatedDailyKm != null ? ` / ${v.estimatedDailyKm} ${t('vehicles.kmPerDay')}` : ''}`
                : '—'}
            </Stat>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label={t('vehicles.fuelType')}>
              {t(`fuelType.${v.fuelType}`)}
            </Stat>
            {v.color && (
              <Stat label={t('vehicles.color')}>{v.color}</Stat>
            )}
          </div>
          <Card>
            <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              {t('vehicles.lastService')}
            </p>
            {v.latestService ? (
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                  {v.latestService.types.map((type) =>
                    type === 'OTHER' && v.latestService!.customType
                      ? v.latestService!.customType
                      : t(`serviceType.${type}`)
                  ).join(', ')}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {new Date(v.latestService.date).toLocaleDateString(dateLocale)}
                  {v.latestService.shop && ` · ${v.latestService.shop}`}
                </p>
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('vehicles.noServiceYet')}</p>
            )}
          </Card>

          {v.upcomingReminders.length > 0 && (
            <Card style={{ borderColor: 'color-mix(in srgb, #f59e0b 40%, transparent)' }}>
              <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                {t('reminders.upcoming')}
              </p>
              <ul className="space-y-1">
                {v.upcomingReminders.slice(0, 3).map((r) => {
                  const isOverdue = r.dueDate && new Date(r.dueDate) < new Date()
                  return (
                    <li key={r.id} className="flex items-center justify-between text-sm">
                      <span style={{ color: isOverdue ? 'var(--danger)' : 'var(--text-primary)', fontWeight: isOverdue ? 500 : undefined }}>
                        {t(`reminderType.${r.type}`)}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {r.dueDate && new Date(r.dueDate).toLocaleDateString(dateLocale)}
                        {r.dueMileage && ` · ${r.dueMileage.toLocaleString()} km`}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button onClick={() => setModal('service')} className="py-2.5">
              <Wrench size={15} /> {t('serviceRecords.add')}
            </Button>
            <Button onClick={() => setModal('expense')} className="py-2.5"
              style={{ backgroundColor: '#059669', color: '#fff' }}>
              <Receipt size={15} /> {t('expenses.add')}
            </Button>
            <Button onClick={() => setModal('mileage')} className="py-2.5" variant="secondary">
              <Gauge size={15} /> {t('mileage.add')}
            </Button>
            <Button onClick={() => setModal('reminder')} className="py-2.5"
              style={{ backgroundColor: '#d97706', color: '#fff' }}>
              <Bell size={15} /> {t('reminders.add')}
            </Button>
          </div>
        </div>
      )}

      {/* Service records */}
      {tab === 'service' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setModal('service')}>
              + {t('serviceRecords.add')}
            </Button>
          </div>
          {serviceRecords.isLoading
            ? <ListSkeleton />
            : <ServiceRecordList vehicleId={id} records={serviceRecords.data ?? []} />
          }
        </div>
      )}

      {/* Expenses */}
      {tab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setModal('expense')} style={{ backgroundColor: '#059669', color: '#fff' }}>
              + {t('expenses.add')}
            </Button>
          </div>
          {expenses.isLoading
            ? <ListSkeleton />
            : <ExpenseList vehicleId={id} expenses={expenses.data ?? []} />
          }
        </div>
      )}

      {/* Mileage */}
      {tab === 'mileage' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setModal('mileage')}>
              + {t('mileage.add')}
            </Button>
          </div>
          {mileageLogs.isLoading
            ? <ListSkeleton />
            : <MileageLogList vehicleId={id} logs={mileageLogs.data ?? []} />
          }
        </div>
      )}

      {/* Reminders */}
      {tab === 'reminders' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setModal('reminder')} style={{ backgroundColor: '#d97706', color: '#fff' }}>
              + {t('reminders.add')}
            </Button>
          </div>
          {reminders.isLoading
            ? <ListSkeleton />
            : <ReminderList vehicleId={id} reminders={reminders.data ?? []} />
          }
        </div>
      )}

      {/* Documents */}
      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setModal('document')}>
              + {t('documents.upload')}
            </Button>
          </div>
          {documents.isLoading
            ? <ListSkeleton />
            : <DocumentList vehicleId={id} documents={documents.data ?? []} />
          }
        </div>
      )}

      {/* Timeline */}
      {tab === 'timeline' && (
        <TimelineList entries={timeline.data?.items} isLoading={timeline.isLoading} vehicleId={id} />
      )}

      {/* Modals */}
      {modal === 'service' && (
        <AddServiceRecordForm vehicleId={id} onClose={() => setModal(null)}
          onSuccess={() => onFormSuccess(t('common.saveSuccess'))} />
      )}
      {modal === 'expense' && (
        <AddExpenseForm vehicleId={id} onClose={() => setModal(null)}
          onSuccess={() => onFormSuccess(t('common.saveSuccess'))} />
      )}
      {modal === 'reminder' && (
        <AddReminderForm vehicleId={id} onClose={() => setModal(null)}
          onSuccess={() => onFormSuccess()} />
      )}
      {modal === 'mileage' && (
        <AddMileageLogForm vehicleId={id} onClose={() => setModal(null)}
          onSuccess={() => onFormSuccess(t('common.saveSuccess'))} />
      )}
      {modal === 'edit_vehicle' && (
        <EditVehicleForm vehicle={v} onClose={() => setModal(null)}
          onSuccess={() => onFormSuccess()} />
      )}
      {modal === 'document' && (
        <UploadDocumentForm vehicleId={id} onClose={() => setModal(null)}
          onSuccess={() => onFormSuccess(t('common.saveSuccess'))} />
      )}
    </Page>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">{children}</div>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card>
      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{children}</p>
    </Card>
  )
}
