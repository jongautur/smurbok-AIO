'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useVehicleOverview, useVehicleTimeline } from '@/hooks/use-vehicle'
import { useReminders } from '@/hooks/use-reminders'
import { useToast } from '@/providers/toast-provider'
import { AddServiceRecordForm } from '@/components/vehicles/add-service-record-form'
import { AddExpenseForm } from '@/components/vehicles/add-expense-form'
import { EditVehicleForm } from '@/components/vehicles/edit-vehicle-form'
import { AddMileageLogForm } from '@/components/vehicles/add-mileage-log-form'
import { AddReminderForm } from '@/components/reminders/add-reminder-form'
import { ReminderList } from '@/components/reminders/reminder-list'
import { TimelineList } from '@/components/timeline/timeline-list'
import { UploadDocumentForm } from '@/components/vehicles/upload-document-form'
import { DocumentList } from '@/components/vehicles/document-list'
import { useDocuments } from '@/hooks/use-documents'
import { OverviewSkeleton } from '@/components/ui/skeleton'

type Tab = 'overview' | 'timeline' | 'reminders' | 'documents'
type Modal = 'service' | 'expense' | 'reminder' | 'mileage' | 'edit_vehicle' | 'document' | null

export default function VehiclePage() {
  const { id, locale } = useParams<{ id: string; locale: string }>()
  const router = useRouter()
  const t = useTranslations()
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('overview')
  const [modal, setModal] = useState<Modal>(null)

  const overview = useVehicleOverview(id)
  const timeline = useVehicleTimeline(id, tab === 'timeline')
  const reminders = useReminders(id)
  const documents = useDocuments(id)

  const overdueCount = reminders.data?.filter(
    (r) => r.status === 'PENDING' && r.dueDate && new Date(r.dueDate) < new Date(),
  ).length ?? 0

  if (overview.isLoading) return <Shell><OverviewSkeleton /></Shell>
  if (overview.error || !overview.data) {
    return <Shell><p className="text-sm text-red-500">{t('common.error')}</p></Shell>
  }

  const v = overview.data

  function onFormSuccess(msg?: string) {
    setModal(null)
    if (msg) toast(msg)
  }

  return (
    <Shell>
      <button
        onClick={() => router.push(`/${locale}/vehicles`)}
        className="text-gray-400 hover:text-gray-600 text-sm mb-4 inline-block"
      >
        ← {t('common.back')}
      </button>

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {v.year} {v.make} {v.model}
          </h1>
          <p className="text-sm text-gray-500">{v.licensePlate}</p>
        </div>
        <button
          onClick={() => setModal('edit_vehicle')}
          className="text-sm text-gray-400 hover:text-blue-600 border border-gray-200 rounded-md px-3 py-1.5 shrink-0"
        >
          {t('common.edit')}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        {(['overview', 'timeline', 'reminders', 'documents'] as Tab[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`pb-2 text-sm font-medium border-b-2 -mb-px transition-colors relative ${
              tab === key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {key === 'overview' && t('vehicles.overview')}
            {key === 'timeline' && t('vehicles.timeline')}
            {key === 'documents' && t('documents.title')}
            {key === 'reminders' && (
              <>
                {t('reminders.title')}
                {overdueCount > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                    {overdueCount}
                  </span>
                )}
              </>
            )}
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
              {v.estimatedMileage != null ? `~${v.estimatedMileage.toLocaleString()} km` : '—'}
            </Stat>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label={t('vehicles.fuelType')}>
              {t(`fuelType.${v.fuelType}`)}
            </Stat>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
              {t('vehicles.lastService')}
            </p>
            {v.latestService ? (
              <div>
                <p className="font-medium text-sm text-gray-900">
                  {t(`serviceType.${v.latestService.type}`)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(v.latestService.date).toLocaleDateString('is-IS')}
                  {v.latestService.shop && ` · ${v.latestService.shop}`}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">{t('vehicles.noServiceYet')}</p>
            )}
          </div>

          {/* Upcoming reminders preview */}
          {v.upcomingReminders.length > 0 && (
            <div className="bg-white border border-amber-200 rounded-lg p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                {t('reminders.upcoming')}
              </p>
              <ul className="space-y-1">
                {v.upcomingReminders.slice(0, 3).map((r) => {
                  const isOverdue = r.dueDate && new Date(r.dueDate) < new Date()
                  return (
                    <li key={r.id} className="flex items-center justify-between text-sm">
                      <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-700'}>
                        {t(`reminderType.${r.type}`)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {r.dueDate && new Date(r.dueDate).toLocaleDateString('is-IS')}
                        {r.dueMileage && ` · ${r.dueMileage.toLocaleString()} km`}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2 text-center">
            {Object.entries(v.counts).map(([key, val]) => (
              <div key={key} className="bg-white border border-gray-200 rounded-lg py-3">
                <p className="text-lg font-semibold text-gray-900">{val}</p>
                <p className="text-xs text-gray-400 mt-0.5">{key}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={() => setModal('service')}
              className="bg-blue-600 text-white rounded-md py-2.5 text-sm font-medium hover:bg-blue-700">
              🔧 {t('serviceRecords.add')}
            </button>
            <button onClick={() => setModal('expense')}
              className="bg-emerald-600 text-white rounded-md py-2.5 text-sm font-medium hover:bg-emerald-700">
              💰 {t('expenses.add')}
            </button>
            <button onClick={() => setModal('mileage')}
              className="bg-gray-600 text-white rounded-md py-2.5 text-sm font-medium hover:bg-gray-700">
              📍 {t('mileage.add')}
            </button>
            <button onClick={() => setModal('reminder')}
              className="bg-amber-500 text-white rounded-md py-2.5 text-sm font-medium hover:bg-amber-600">
              🔔 {t('reminders.add')}
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {tab === 'timeline' && (
        <TimelineList entries={timeline.data?.data} isLoading={timeline.isLoading} vehicleId={id} />
      )}

      {/* Reminders */}
      {tab === 'reminders' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setModal('reminder')}
              className="bg-amber-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-amber-600">
              + {t('reminders.add')}
            </button>
          </div>
          {reminders.data && (
            <ReminderList vehicleId={id} reminders={reminders.data} />
          )}
        </div>
      )}

      {/* Documents */}
      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setModal('document')}
              className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700">
              + {t('documents.upload')}
            </button>
          </div>
          {documents.data && (
            <DocumentList vehicleId={id} documents={documents.data} />
          )}
        </div>
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
          onSuccess={() => onFormSuccess(t('common.saveSuccess'))} />
      )}
      {modal === 'document' && (
        <UploadDocumentForm vehicleId={id} onClose={() => setModal(null)}
          onSuccess={() => onFormSuccess(t('common.saveSuccess'))} />
      )}
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

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900">{children}</p>
    </div>
  )
}
