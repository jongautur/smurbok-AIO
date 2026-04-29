'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Wrench, Receipt, Gauge, Bell, ArrowLeft, Pencil, Trash2, Plus, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal, Field, inputCls } from '@/components/ui/modal'
import { lp } from '@/lib/locale-path'
import { ServiceTypeSelector, type ServiceEntry } from '@/components/vehicles/service-type-selector'

// ─── Types ───────────────────────────────────────────────────────────────────

type ServiceType = 'OIL_CHANGE' | 'ENGINE_OIL_CHANGE' | 'TRANSMISSION_OIL_CHANGE' |
  'TIRE_ROTATION' | 'TIRE_CHANGE' | 'BRAKE_SERVICE' |
  'FILTER_CHANGE' | 'INSPECTION' | 'TRANSMISSION_SERVICE' | 'COOLANT_FLUSH' |
  'BATTERY_REPLACEMENT' | 'WINDSHIELD' | 'OTHER'

type ExpenseCategory = 'FUEL' | 'SERVICE' | 'INSURANCE' | 'TAX' | 'PARKING' | 'TOLL' | 'REPAIR' | 'OTHER'

type ReminderType = 'OIL_CHANGE' | 'INSPECTION' | 'INSURANCE_RENEWAL' | 'TAX_DUE' | 'TIRE_CHANGE' | 'OTHER'

type ReminderStatus = 'PENDING' | 'DONE' | 'SNOOZED'

interface ServiceRecord {
  id: string
  types: ServiceType[]
  customType?: string
  date: string
  mileage: number | null
  cost: number | null
  shop: string
  description: string
}

interface Expense {
  id: string
  category: ExpenseCategory
  amount: number
  date: string
  description: string
}

interface MileageLog {
  id: string
  mileage: number
  date: string
  note: string
}

interface Reminder {
  id: string
  type: ReminderType
  dueDate: string | null
  dueMileage: number | null
  note: string
  status: ReminderStatus
}

// ─── Seed data ───────────────────────────────────────────────────────────────

const SEED_SERVICE: ServiceRecord[] = [
  { id: 's1', types: ['ENGINE_OIL_CHANGE'], date: '2025-01-15', mileage: 47200, cost: 12500, shop: 'Bílsmiður Reykjavík', description: 'Full synthetic 5W-30' },
  { id: 's2', types: ['TIRE_CHANGE'],       date: '2024-11-04', mileage: 45800, cost: 32000, shop: 'Dekkjaþjónusta Keflavík', description: 'Switched to winter tyres' },
  { id: 's3', types: ['INSPECTION'],        date: '2024-09-22', mileage: 44100, cost: 8900, shop: 'Samgöngustofa', description: '' },
]

const SEED_EXPENSES: Expense[] = [
  { id: 'e1', category: 'FUEL',      amount: 15400, date: '2025-03-10', description: 'Full tank' },
  { id: 'e2', category: 'INSURANCE', amount: 68000, date: '2025-01-01', description: 'Annual premium' },
  { id: 'e3', category: 'FUEL',      amount: 14900, date: '2024-12-20', description: '' },
  { id: 'e4', category: 'TAX',       amount: 22000, date: '2024-11-01', description: 'Vehicle tax 2025' },
]

const SEED_MILEAGE: MileageLog[] = [
  { id: 'm1', mileage: 48750, date: '2025-04-01', note: '' },
  { id: 'm2', mileage: 47200, date: '2025-01-15', note: 'After oil change' },
  { id: 'm3', mileage: 45000, date: '2024-10-01', note: '' },
]

const SEED_REMINDERS: Reminder[] = [
  { id: 'r1', type: 'OIL_CHANGE',        dueDate: '2025-07-15', dueMileage: 52000, note: 'Every 6 months or 5 000 km', status: 'PENDING' },
  { id: 'r2', type: 'INSPECTION',        dueDate: '2025-09-22', dueMileage: null,  note: '', status: 'PENDING' },
  { id: 'r3', type: 'INSURANCE_RENEWAL', dueDate: '2026-01-01', dueMileage: null,  note: 'Renew before January', status: 'PENDING' },
]


const EXPENSE_CATEGORIES: ExpenseCategory[] = ['FUEL','SERVICE','INSURANCE','TAX','PARKING','TOLL','REPAIR','OTHER']
const REMINDER_TYPES: ReminderType[] = ['OIL_CHANGE','INSPECTION','INSURANCE_RENEWAL','TAX_DUE','TIRE_CHANGE','OTHER']

let _id = 100
const uid = () => String(++_id)

type Tab = 'overview' | 'service' | 'expenses' | 'mileage' | 'reminders'
const TABS: Tab[] = ['overview', 'service', 'expenses', 'mileage', 'reminders']

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const t = useTranslations()
  const { locale } = useParams<{ locale: string }>()

  const [tab, setTab] = useState<Tab>('overview')
  const [serviceRecords, setService] = useState<ServiceRecord[]>(SEED_SERVICE)
  const [expenses, setExpenses] = useState<Expense[]>(SEED_EXPENSES)
  const [mileageLogs, setMileage] = useState<MileageLog[]>(SEED_MILEAGE)
  const [reminders, setReminders] = useState<Reminder[]>(SEED_REMINDERS)

  // modal state
  const [modal, setModal] = useState<
    | { kind: 'add_service' }
    | { kind: 'edit_service'; rec: ServiceRecord }
    | { kind: 'add_expense' }
    | { kind: 'edit_expense'; rec: Expense }
    | { kind: 'add_mileage' }
    | { kind: 'add_reminder' }
    | { kind: 'edit_reminder'; rec: Reminder }
    | { kind: 'confirm_delete'; label: string; onConfirm: () => void }
    | null
  >(null)

  const latestMileage = mileageLogs.length ? Math.max(...mileageLogs.map((m) => m.mileage)) : null
  const overdueReminders = reminders.filter(
    (r) => r.status === 'PENDING' && r.dueDate && new Date(r.dueDate) < new Date(),
  )

  const tabLabels: Record<Tab, React.ReactNode> = {
    overview:  t('vehicles.overview'),
    service:   t('serviceRecords.title'),
    expenses:  t('expenses.title'),
    mileage:   t('mileage.title'),
    reminders: (
      <span className="flex items-center gap-1.5">
        {t('reminders.title')}
        {overdueReminders.length > 0 && <Badge variant="danger">{overdueReminders.length}</Badge>}
      </span>
    ),
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--surface)' }}>
      {/* Demo banner */}
      <div
        className="px-4 py-2.5 flex items-center justify-center gap-2 text-sm text-center"
        style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
      >
        <Info size={14} className="shrink-0" />
        <span>{t('demo.banner')}</span>
        <Link href={lp(locale, '/login')} className="font-semibold underline underline-offset-2 ml-1">
          {t('demo.createAccount')}
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back */}
        <Link
          href={lp(locale, '/')}
          className="inline-flex items-center gap-1 text-sm mb-4 transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={14} /> {t('common.back')}
        </Link>

        {/* Vehicle header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              2020 Subaru Forester
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>KSF 20</p>
          </div>
          <Badge variant="muted">{t('demo.demoMode')}</Badge>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b mb-6 overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
          {TABS.map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="pb-2 px-1 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0"
              style={{
                borderColor: tab === key ? 'var(--accent)' : 'transparent',
                color: tab === key ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {tabLabels[key]}
            </button>
          ))}
        </div>

        {/* ── Overview ──────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat label={t('vehicles.mileage')}>
                {latestMileage != null ? `${latestMileage.toLocaleString()} km` : '—'}
              </Stat>
              <Stat label={t('vehicles.fuelType')}>{t('fuelType.DIESEL')}</Stat>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label={t('vehicles.color')}>Silver</Stat>
              <Stat label={t('vehicles.vin')}><span className="font-mono text-xs">JF2SKAFC9LH400001</span></Stat>
            </div>

            <Card>
              <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                {t('vehicles.lastService')}
              </p>
              {serviceRecords[0] && (
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                    {serviceRecords[0].types.map((type) =>
                      type === 'OTHER' && serviceRecords[0].customType
                        ? serviceRecords[0].customType
                        : t(`serviceType.${type}`)
                    ).join(', ')}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {new Date(serviceRecords[0].date).toLocaleDateString()}
                    {serviceRecords[0].shop && ` · ${serviceRecords[0].shop}`}
                  </p>
                </div>
              )}
            </Card>

            {reminders.filter((r) => r.status === 'PENDING').length > 0 && (
              <Card style={{ borderColor: 'color-mix(in srgb, #f59e0b 40%, transparent)' }}>
                <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                  {t('reminders.upcoming')}
                </p>
                <ul className="space-y-1">
                  {reminders.filter((r) => r.status === 'PENDING').slice(0, 3).map((r) => {
                    const isOverdue = r.dueDate && new Date(r.dueDate) < new Date()
                    return (
                      <li key={r.id} className="flex items-center justify-between text-sm">
                        <span style={{ color: isOverdue ? 'var(--danger)' : 'var(--text-primary)', fontWeight: isOverdue ? 500 : undefined }}>
                          {t(`reminderType.${r.type}`)}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {r.dueDate && new Date(r.dueDate).toLocaleDateString()}
                          {r.dueMileage && ` · ${r.dueMileage.toLocaleString()} km`}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button onClick={() => setTab('service')} className="py-2.5">
                <Wrench size={15} /> {t('serviceRecords.title')}
              </Button>
              <Button onClick={() => setTab('expenses')} className="py-2.5"
                style={{ backgroundColor: '#059669', color: '#fff' }}>
                <Receipt size={15} /> {t('expenses.title')}
              </Button>
              <Button onClick={() => setTab('mileage')} className="py-2.5" variant="secondary">
                <Gauge size={15} /> {t('mileage.title')}
              </Button>
              <Button onClick={() => setTab('reminders')} className="py-2.5"
                style={{ backgroundColor: '#d97706', color: '#fff' }}>
                <Bell size={15} /> {t('reminders.title')}
              </Button>
            </div>
          </div>
        )}

        {/* ── Service records ────────────────────────────────────────────── */}
        {tab === 'service' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button onClick={() => setModal({ kind: 'add_service' })}>
                <Plus size={14} /> {t('serviceRecords.add')}
              </Button>
            </div>
            {serviceRecords.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>{t('serviceRecords.empty')}</p>
            )}
            {serviceRecords.map((rec) => (
              <Card key={rec.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {rec.types.map((type) =>
                        type === 'OTHER' && rec.customType ? rec.customType : t(`serviceType.${type}`)
                      ).join(', ')}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {new Date(rec.date).toLocaleDateString()}
                      {rec.mileage && ` · ${rec.mileage.toLocaleString()} km`}
                      {rec.shop && ` · ${rec.shop}`}
                    </p>
                    {rec.description && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{rec.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {rec.cost != null && (
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        {rec.cost.toLocaleString()} kr
                      </span>
                    )}
                    <button onClick={() => setModal({ kind: 'edit_service', rec })} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setModal({ kind: 'confirm_delete', label: rec.types.map((type) => type === 'OTHER' && rec.customType ? rec.customType : t(`serviceType.${type}`)).join(', '), onConfirm: () => { setService((p) => p.filter((s) => s.id !== rec.id)); setModal(null) } })}
                      className="p-1 rounded hover:opacity-70"
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Expenses ───────────────────────────────────────────────────── */}
        {tab === 'expenses' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button onClick={() => setModal({ kind: 'add_expense' })} style={{ backgroundColor: '#059669', color: '#fff' }}>
                <Plus size={14} /> {t('expenses.add')}
              </Button>
            </div>
            {expenses.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>{t('expenses.empty')}</p>
            )}
            {expenses.map((exp) => (
              <Card key={exp.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="muted">{t(`expenseCategory.${exp.category}`)}</Badge>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(exp.date).toLocaleDateString()}
                      {exp.description && ` · ${exp.description}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {exp.amount.toLocaleString()} kr
                    </span>
                    <button onClick={() => setModal({ kind: 'edit_expense', rec: exp })} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setModal({ kind: 'confirm_delete', label: t(`expenseCategory.${exp.category}`), onConfirm: () => { setExpenses((p) => p.filter((e) => e.id !== exp.id)); setModal(null) } })}
                      className="p-1 rounded hover:opacity-70"
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Mileage ────────────────────────────────────────────────────── */}
        {tab === 'mileage' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setModal({ kind: 'add_mileage' })}>
                <Plus size={14} /> {t('mileage.add')}
              </Button>
            </div>
            {mileageLogs.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>{t('mileage.empty')}</p>
            )}
            {mileageLogs.map((log) => (
              <Card key={log.id}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {log.mileage.toLocaleString()} km
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {new Date(log.date).toLocaleDateString()}
                      {log.note && ` · ${log.note}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setModal({ kind: 'confirm_delete', label: `${log.mileage.toLocaleString()} km`, onConfirm: () => { setMileage((p) => p.filter((m) => m.id !== log.id)); setModal(null) } })}
                    className="p-1 rounded hover:opacity-70"
                    style={{ color: 'var(--danger)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Reminders ──────────────────────────────────────────────────── */}
        {tab === 'reminders' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button onClick={() => setModal({ kind: 'add_reminder' })} style={{ backgroundColor: '#d97706', color: '#fff' }}>
                <Plus size={14} /> {t('reminders.add')}
              </Button>
            </div>
            {reminders.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>{t('reminders.empty')}</p>
            )}
            {reminders.map((rem) => {
              const isOverdue = rem.status === 'PENDING' && rem.dueDate && new Date(rem.dueDate) < new Date()
              return (
                <Card key={rem.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-sm" style={{ color: isOverdue ? 'var(--danger)' : 'var(--text-primary)' }}>
                          {t(`reminderType.${rem.type}`)}
                        </p>
                        {rem.status === 'DONE' && <Badge variant="success">{t('reminders.doneStatus')}</Badge>}
                        {isOverdue && <Badge variant="danger">{t('reminders.overdue')}</Badge>}
                      </div>
                      {(rem.dueDate || rem.dueMileage) && (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {rem.dueDate && new Date(rem.dueDate).toLocaleDateString()}
                          {rem.dueMileage && ` · ${rem.dueMileage.toLocaleString()} km`}
                        </p>
                      )}
                      {rem.note && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{rem.note}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {rem.status === 'PENDING' && (
                        <button
                          onClick={() => setReminders((p) => p.map((r) => r.id === rem.id ? { ...r, status: 'DONE' } : r))}
                          className="text-xs px-2 py-1 rounded font-medium hover:opacity-80"
                          style={{ backgroundColor: '#d1fae5', color: '#065f46' }}
                        >
                          {t('reminders.markDone')}
                        </button>
                      )}
                      <button onClick={() => setModal({ kind: 'edit_reminder', rec: rem })} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setModal({ kind: 'confirm_delete', label: t(`reminderType.${rem.type}`), onConfirm: () => { setReminders((p) => p.filter((r) => r.id !== rem.id)); setModal(null) } })}
                        className="p-1 rounded hover:opacity-70"
                        style={{ color: 'var(--danger)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {modal?.kind === 'add_service' && (
        <ServiceModal
          onClose={() => setModal(null)}
          onSave={(rec) => { setService((p) => [rec, ...p]); setModal(null) }}
        />
      )}

      {modal?.kind === 'edit_service' && (
        <ServiceModal
          initial={modal.rec}
          onClose={() => setModal(null)}
          onSave={(rec) => { setService((p) => p.map((s) => s.id === rec.id ? rec : s)); setModal(null) }}
        />
      )}

      {modal?.kind === 'add_expense' && (
        <ExpenseModal
          onClose={() => setModal(null)}
          onSave={(rec) => { setExpenses((p) => [rec, ...p]); setModal(null) }}
        />
      )}

      {modal?.kind === 'edit_expense' && (
        <ExpenseModal
          initial={modal.rec}
          onClose={() => setModal(null)}
          onSave={(rec) => { setExpenses((p) => p.map((e) => e.id === rec.id ? rec : e)); setModal(null) }}
        />
      )}

      {modal?.kind === 'add_mileage' && (
        <MileageModal
          onClose={() => setModal(null)}
          onSave={(rec) => { setMileage((p) => [rec, ...p]); setModal(null) }}
        />
      )}

      {modal?.kind === 'add_reminder' && (
        <ReminderModal
          onClose={() => setModal(null)}
          onSave={(rec) => { setReminders((p) => [...p, rec]); setModal(null) }}
        />
      )}

      {modal?.kind === 'edit_reminder' && (
        <ReminderModal
          initial={modal.rec}
          onClose={() => setModal(null)}
          onSave={(rec) => { setReminders((p) => p.map((r) => r.id === rec.id ? rec : r)); setModal(null) }}
        />
      )}

      {modal?.kind === 'confirm_delete' && (
        <Modal onClose={() => setModal(null)} title={t('common.confirmDelete')}>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            {modal.label}
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setModal(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={modal.onConfirm}>{t('common.delete')}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Helper components ────────────────────────────────────────────────────────

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card>
      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{children}</p>
    </Card>
  )
}

// ─── Service record modal ─────────────────────────────────────────────────────

function ServiceModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: ServiceRecord
  onClose: () => void
  onSave: (rec: ServiceRecord) => void
}) {
  const t = useTranslations()
  const [services, setServices] = useState<ServiceEntry[]>(
    (initial?.types ?? ['OIL_CHANGE']).map((type) =>
      type === 'OTHER' && initial?.customType ? { type, customName: initial.customType } : { type }
    )
  )
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10))
  const [mileage, setMileage] = useState(initial?.mileage?.toString() ?? '')
  const [cost, setCost] = useState(initial?.cost?.toString() ?? '')
  const [shop, setShop] = useState(initial?.shop ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')

  function submit() {
    if (services.length === 0) return
    onSave({
      id: initial?.id ?? uid(),
      types: services.map((s) => s.type as ServiceType),
      customType: services.find((s) => s.type === 'OTHER')?.customName,
      date,
      mileage: mileage ? Number(mileage) : null,
      cost: cost ? Number(cost) : null,
      shop,
      description,
    })
  }

  return (
    <Modal onClose={onClose} title={initial ? t('serviceRecords.edit') : t('serviceRecords.add')}>
      <div className="space-y-3">
        <Field label={t('serviceRecords.type')}>
          <ServiceTypeSelector value={services} onChange={setServices} />
        </Field>
        <Field label={t('serviceRecords.date')}>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={t('serviceRecords.mileage')}>
          <input type="number" className={inputCls} value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="km" />
        </Field>
        <Field label={t('serviceRecords.cost')}>
          <input type="number" className={inputCls} value={cost} onChange={(e) => setCost(e.target.value)} placeholder="kr" />
        </Field>
        <Field label={t('serviceRecords.shop')}>
          <input type="text" className={inputCls} value={shop} onChange={(e) => setShop(e.target.value)} />
        </Field>
        <Field label={t('serviceRecords.description')}>
          <input type="text" className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
          <Button className="flex-1" onClick={submit}>{t('common.save')}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Expense modal ────────────────────────────────────────────────────────────

function ExpenseModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Expense
  onClose: () => void
  onSave: (rec: Expense) => void
}) {
  const t = useTranslations()
  const [category, setCategory] = useState<ExpenseCategory>(initial?.category ?? 'FUEL')
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? '')
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState(initial?.description ?? '')

  function submit() {
    if (!amount) return
    onSave({ id: initial?.id ?? uid(), category, amount: Number(amount), date, description })
  }

  return (
    <Modal onClose={onClose} title={initial ? t('expenses.edit') : t('expenses.add')}>
      <div className="space-y-3">
        <Field label={t('expenses.category')}>
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{t(`expenseCategory.${c}`)}</option>)}
          </select>
        </Field>
        <Field label={t('expenses.amount')}>
          <input type="number" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="kr" />
        </Field>
        <Field label={t('expenses.date')}>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={t('expenses.description')}>
          <input type="text" className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
          <Button className="flex-1" onClick={submit} style={{ backgroundColor: '#059669', color: '#fff' }}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Mileage modal ────────────────────────────────────────────────────────────

function MileageModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (rec: MileageLog) => void
}) {
  const t = useTranslations()
  const [mileage, setMileage] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')

  function submit() {
    if (!mileage) return
    onSave({ id: uid(), mileage: Number(mileage), date, note })
  }

  return (
    <Modal onClose={onClose} title={t('mileage.add')}>
      <div className="space-y-3">
        <Field label={t('mileage.current')}>
          <input type="number" className={inputCls} value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="km" autoFocus />
        </Field>
        <Field label={t('mileage.date')}>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={`${t('mileage.note')} (${t('mileage.optional')})`}>
          <input type="text" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="secondary" className="flex-1" onClick={submit}>{t('common.save')}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Reminder modal ───────────────────────────────────────────────────────────

function ReminderModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Reminder
  onClose: () => void
  onSave: (rec: Reminder) => void
}) {
  const t = useTranslations()
  const [type, setType] = useState<ReminderType>(initial?.type ?? 'OIL_CHANGE')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [dueMileage, setDueMileage] = useState(initial?.dueMileage?.toString() ?? '')
  const [note, setNote] = useState(initial?.note ?? '')

  function submit() {
    onSave({
      id: initial?.id ?? uid(),
      type,
      dueDate: dueDate || null,
      dueMileage: dueMileage ? Number(dueMileage) : null,
      note,
      status: initial?.status ?? 'PENDING',
    })
  }

  return (
    <Modal onClose={onClose} title={initial ? t('reminders.edit') : t('reminders.add')}>
      <div className="space-y-3">
        <Field label={t('reminders.type')}>
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as ReminderType)}>
            {REMINDER_TYPES.map((r) => <option key={r} value={r}>{t(`reminderType.${r}`)}</option>)}
          </select>
        </Field>
        <Field label={`${t('reminders.dueDate')} (${t('mileage.optional')})`}>
          <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field label={`${t('reminders.dueMileage')} (${t('mileage.optional')})`}>
          <input type="number" className={inputCls} value={dueMileage} onChange={(e) => setDueMileage(e.target.value)} placeholder="km" />
        </Field>
        <Field label={`${t('reminders.note')} (${t('mileage.optional')})`}>
          <input type="text" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
          <Button className="flex-1" onClick={submit} style={{ backgroundColor: '#d97706', color: '#fff' }}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
