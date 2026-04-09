'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useVehicles } from '@/hooks/use-vehicles'
import { CreateVehicleForm } from '@/components/vehicles/create-vehicle-form'
import { VehicleCardSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

export default function VehiclesPage() {
  const t = useTranslations()
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()
  const [showCreate, setShowCreate] = useState(false)

  const { data: vehicles, isLoading, error } = useVehicles()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">{t('vehicles.title')}</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700"
          >
            + {t('vehicles.add')}
          </button>
        </div>

        {isLoading && (
          <div className="space-y-3">
            <VehicleCardSkeleton />
            <VehicleCardSkeleton />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500">{t('common.error')}</p>
        )}

        {!isLoading && vehicles?.length === 0 && (
          <EmptyState
            icon="🚗"
            message={t('vehicles.empty')}
            action={
              <button
                onClick={() => setShowCreate(true)}
                className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700"
              >
                {t('vehicles.add')}
              </button>
            }
          />
        )}

        {vehicles && vehicles.length > 0 && (
          <ul className="space-y-3">
            {vehicles.map((v) => (
              <li
                key={v.id}
                onClick={() => router.push(`/${locale}/vehicles/${v.id}`)}
                className="bg-white border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:border-blue-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {v.year} {v.make} {v.model}
                    </p>
                    <p className="text-sm text-gray-500">{v.licensePlate}</p>
                  </div>
                  <div className="text-right text-sm text-gray-400">
                    {v.latestMileage != null && (
                      <p>{v.latestMileage.toLocaleString()} km</p>
                    )}
                    <p>{v.counts.serviceRecords} þjónustur</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showCreate && (
        <CreateVehicleForm
          onClose={() => setShowCreate(false)}
          onSuccess={(id) => {
            setShowCreate(false)
            router.push(`/${locale}/vehicles/${id}`)
          }}
        />
      )}
    </div>
  )
}
