'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Car, Archive, Trash2, RotateCcw } from 'lucide-react'
import { useVehicles, useArchiveVehicle, useRestoreVehicle, useDeleteVehicle, useUndeleteVehicle } from '@/hooks/use-vehicles'
import { useToast } from '@/providers/toast-provider'
import { CreateVehicleForm } from '@/components/vehicles/create-vehicle-form'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { VehicleCardSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { lp } from '@/lib/locale-path'
import type { VehicleListItem } from '@/types'

type View = 'active' | 'archived'
type PendingAction = { type: 'archive' | 'delete'; id: string } | null

export default function VehiclesPage() {
  const t = useTranslations()
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()
  const { toast } = useToast()

  const [view, setView] = useState<View>('active')
  const [showCreate, setShowCreate] = useState(false)
  const [pending, setPending] = useState<PendingAction>(null)

  const { data: vehicles, isLoading, error } = useVehicles(view === 'archived')
  const archiveMutation = useArchiveVehicle()
  const restoreMutation = useRestoreVehicle()
  const deleteMutation = useDeleteVehicle()
  const undeleteMutation = useUndeleteVehicle()

  async function confirmAction() {
    if (!pending) return
    try {
      if (pending.type === 'archive') {
        await archiveMutation.mutateAsync(pending.id)
        toast(t('vehicles.archiveSuccess'))
      } else {
        const deletedId = pending.id
        await deleteMutation.mutateAsync(deletedId)
        toast(t('vehicles.deleteSuccess'), 'success', () => undeleteMutation.mutate(deletedId))
      }
    } catch {
      toast(t('common.error'), 'error')
    } finally {
      setPending(null)
    }
  }

  async function handleRestore(id: string) {
    try {
      await restoreMutation.mutateAsync(id)
      toast(t('vehicles.restoreSuccess'))
    } catch {
      toast(t('common.error'), 'error')
    }
  }

  const actionLoading = archiveMutation.isPending || deleteMutation.isPending

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('vehicles.title')}
        </h1>
        {view === 'active' && (
          <Button onClick={() => setShowCreate(true)}>
            + {t('vehicles.add')}
          </Button>
        )}
      </div>

      {/* Active / Archived toggle */}
      <div
        className="flex rounded-lg border overflow-hidden text-sm font-medium mb-6"
        style={{ borderColor: 'var(--border)' }}
      >
        {(['active', 'archived'] as View[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className="flex-1 py-2 transition-colors"
            style={{
              backgroundColor: view === v ? 'var(--accent)' : 'var(--surface-raised)',
              color: view === v ? 'var(--accent-fg)' : 'var(--text-muted)',
            }}
          >
            {v === 'active' ? t('vehicles.title') : t('vehicles.showArchived')}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          <VehicleCardSkeleton />
          <VehicleCardSkeleton />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm" style={{ color: 'var(--danger)' }}>{t('common.error')}</p>
      )}

      {/* Empty state */}
      {!isLoading && vehicles?.length === 0 && (
        <EmptyState
          icon={<Car size={36} />}
          message={view === 'archived' ? t('vehicles.archivedEmpty') : t('vehicles.empty')}
          action={view === 'active' ? (
            <Button onClick={() => setShowCreate(true)}>
              {t('vehicles.add')}
            </Button>
          ) : undefined}
        />
      )}

      {/* Vehicle list */}
      {vehicles && vehicles.length > 0 && (
        <ul className="space-y-3">
          {vehicles.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              archived={view === 'archived'}
              onNavigate={() => router.push(lp(locale, `/vehicles/${v.id}`))}
              onArchive={() => setPending({ type: 'archive', id: v.id })}
              onDelete={() => setPending({ type: 'delete', id: v.id })}
              onRestore={() => handleRestore(v.id)}
              restoring={restoreMutation.isPending && restoreMutation.variables === v.id}
              t={t}
            />
          ))}
        </ul>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateVehicleForm
          onClose={() => setShowCreate(false)}
          onSuccess={(id) => {
            setShowCreate(false)
            router.push(`/${locale}/vehicles/${id}`)
          }}
        />
      )}

      {/* Confirm dialog */}
      {pending && (
        <ConfirmDialog
          message={pending.type === 'archive' ? t('vehicles.confirmArchive') : t('vehicles.confirmDelete')}
          onConfirm={confirmAction}
          onCancel={() => setPending(null)}
          loading={actionLoading}
        />
      )}
    </div>
  )
}

function VehicleCard({
  vehicle: v,
  archived,
  onNavigate,
  onArchive,
  onDelete,
  onRestore,
  restoring,
  t,
}: {
  vehicle: VehicleListItem
  archived: boolean
  onNavigate: () => void
  onArchive: () => void
  onDelete: () => void
  onRestore: () => void
  restoring: boolean
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <li
      onClick={onNavigate}
      className="rounded-lg px-4 py-3 cursor-pointer border transition-colors hover:opacity-90"
      style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {v.year} {v.make} {v.model}
            </p>
            <Badge variant="muted">{t(`fuelType.${v.fuelType}`)}</Badge>
            {archived && <Badge variant="warn">{t('vehicles.archived')}</Badge>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{v.licensePlate}</p>
            {v.vin && (
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{v.vin}</p>
            )}
          </div>
          {v.latestMileage != null && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {v.latestMileage.toLocaleString()} km
            </p>
          )}
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {archived ? (
            <button
              type="button"
              onClick={onRestore}
              disabled={restoring}
              className="text-xs font-medium px-2 py-1 rounded transition-opacity hover:opacity-70 disabled:opacity-50"
              style={{ color: 'var(--accent)' }}
            >
              {t('vehicles.restore')}
            </button>
          ) : (
            <>
              <IconBtn onClick={onArchive} label={t('vehicles.archive')}>
                <Archive size={15} />
              </IconBtn>
              <IconBtn onClick={onDelete} label={t('common.delete')} destructive>
                <Trash2 size={15} />
              </IconBtn>
            </>
          )}
        </div>
      </div>
    </li>
  )
}

function IconBtn({
  children,
  onClick,
  label,
  destructive = false,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="p-1.5 rounded-md transition-opacity hover:opacity-70"
      style={{ color: destructive ? 'var(--danger)' : 'var(--text-muted)' }}
    >
      {children}
    </button>
  )
}
