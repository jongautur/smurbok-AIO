'use client'

import { useState } from 'react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Download, Trash2, FileText } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { useStorage } from '@/hooks/use-storage'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function UserPage() {
  const t = useTranslations()
  const { appUser, refresh, logout } = useAuth()
  const { locale } = useParams<{ locale: string }>()
  const router = useRouter()
  const pathname = usePathname()
  const storage = useStorage()

  const [notifSaving, setNotifSaving] = useState(false)
  const [langSaving, setLangSaving] = useState(false)
  const [currencyValue, setCurrencyValue] = useState<string | null>(null)
  const [currencySaving, setCurrencySaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)

  if (!appUser) return null

  async function toggleNotifications() {
    if (!appUser) return
    setNotifSaving(true)
    try {
      await api.patch('/auth/me/notifications', { emailNotifications: !appUser.emailNotifications })
      await refresh()
    } finally {
      setNotifSaving(false)
    }
  }

  async function saveCurrency() {
    const val = (currencyValue ?? appUser?.currency ?? 'kr').trim() || 'kr'
    setCurrencySaving(true)
    try {
      await api.patch('/auth/me/currency', { currency: val })
      await refresh()
    } finally {
      setCurrencySaving(false)
    }
  }

  async function switchLanguage(lang: 'is' | 'en') {
    if (lang === appUser?.language) return
    setLangSaving(true)
    try {
      await api.patch('/auth/me/language', { language: lang })
      // Navigate to the same page in the new locale
      const newPath = lang === 'en'
        ? `/en${pathname.replace(/^\/en/, '')}`
        : pathname.replace(/^\/en/, '') || '/'
      router.push(newPath)
    } catch {
      setLangSaving(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const resp = await api.get('/auth/me/export', { responseType: 'blob' })
      const url = URL.createObjectURL(resp.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'smurbok-export.zip'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  async function handleDeleteAccount() {
    if (deleteText.toLowerCase() !== 'delete') return
    setDeleting(true)
    try {
      await api.delete('/auth/me')
      await logout()
      router.push(`/${locale}/login`)
    } catch {
      setDeleting(false)
    }
  }

  const storageData = storage.data
  const storagePercent = storageData?.files.percent ?? 0
  const storageColor = storagePercent > 90 ? 'var(--danger)' : storagePercent > 70 ? '#d97706' : 'var(--accent)'

  const memberSince = appUser.createdAt
    ? new Date(appUser.createdAt).toLocaleDateString(appUser.language === 'en' ? 'en-GB' : 'is-IS', { year: 'numeric', month: 'long' })
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        {t('user.title')}
      </h1>

      {/* ── Profile ────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <Card>
          <Row label={t('user.name')} first>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {appUser.displayName ?? appUser.email}
            </p>
            {appUser.displayName && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{appUser.email}</p>
            )}
          </Row>

          {memberSince && (
            <Row label={t('user.memberSince')}>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{memberSince}</p>
            </Row>
          )}

          <Row label={t('user.language')}>
            <div className="flex gap-2">
              {(['is', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  disabled={langSaving}
                  onClick={() => switchLanguage(lang)}
                  className="px-3 py-1 rounded-md text-xs font-medium border transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{
                    borderColor: appUser.language === lang ? 'var(--accent)' : 'var(--border)',
                    color: appUser.language === lang ? 'var(--accent)' : 'var(--text-muted)',
                    backgroundColor: appUser.language === lang
                      ? 'color-mix(in srgb, var(--accent) 10%, transparent)'
                      : 'transparent',
                  }}
                >
                  {lang === 'is' ? 'Íslenska' : 'English'}
                </button>
              ))}
            </div>
          </Row>

          <Row label={t('user.currency')}>
            <div className="space-y-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currencyValue ?? (appUser.currency || 'kr')}
                  onChange={(e) => setCurrencyValue(e.target.value)}
                  maxLength={10}
                  className="w-24 px-2 py-1 rounded-md border text-sm"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  onClick={saveCurrency}
                  disabled={currencySaving}
                  className="px-3 py-1 rounded-md text-xs font-medium border transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  {t('common.save')}
                </button>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('user.currencyHint')}</p>
            </div>
          </Row>
        </Card>
      </section>

      {/* ── Notifications ──────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeading>{t('user.notifications')}</SectionHeading>
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('user.emailNotifications')}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {t('user.emailNotificationsHint')}
              </p>
            </div>
            <Toggle
              checked={appUser.emailNotifications}
              disabled={notifSaving}
              onChange={toggleNotifications}
            />
          </div>
        </Card>
      </section>

      {/* ── Storage ────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeading>{t('user.storage')}</SectionHeading>
        <Card className="space-y-4">
          {storage.isLoading ? (
            <div className="h-4 rounded animate-pulse" style={{ backgroundColor: 'var(--border)' }} />
          ) : storageData ? (
            <>
              {/* File storage bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  <span>{storageData.files.usedMB.toFixed(1)} MB {t('user.storageUsed')}</span>
                  <span>{storageData.files.limitMB} MB {t('user.storageLimit')}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(storagePercent, 100)}%`,
                      backgroundColor: storageColor,
                    }}
                  />
                </div>
              </div>

              {/* Counts */}
              <div className="grid grid-cols-2 gap-3">
                <StorageStat
                  label={t('documents.title')}
                  value={storageData.documents.count}
                  limit={storageData.documents.limit}
                />
                <StorageStat
                  label={t('nav.vehicles')}
                  value={storageData.vehicles.count}
                  limit={storageData.vehicles.limit}
                />
              </div>

              {/* Document list by size */}
              {storageData.topDocuments.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                    {t('user.topDocuments')}
                  </p>
                  <div className="space-y-1">
                    {storageData.topDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-md"
                        style={{ backgroundColor: 'var(--surface)' }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={13} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{doc.label}</p>
                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{doc.vehicleLabel}</p>
                          </div>
                        </div>
                        <p className="text-xs shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                          {doc.fileSizeBytes != null ? formatBytes(doc.fileSizeBytes) : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('user.noDocuments')}</p>
              )}
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('common.error')}</p>
          )}
        </Card>
      </section>

      {/* ── Danger zone ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeading color="var(--danger)">{t('user.dangerZone')}</SectionHeading>
        <Card style={{ borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)' }}>
          <div className="space-y-4">
            {/* Export */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {t('user.exportData')}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {t('user.exportDataHint')}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={exporting}
                onClick={handleExport}
                className="shrink-0"
              >
                <Download size={13} /> {exporting ? t('user.exporting') : t('user.exportData')}
              </Button>
            </div>

            <div className="border-t" style={{ borderColor: 'var(--border)' }} />

            {/* Delete account */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>
                    {t('user.deleteAccount')}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {t('user.deleteAccountHint')}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { setDeleteOpen(!deleteOpen); setDeleteText('') }}
                  className="shrink-0"
                >
                  <Trash2 size={13} /> {t('common.delete')}
                </Button>
              </div>

              {deleteOpen && (
                <div
                  className="rounded-lg p-3 space-y-3"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 6%, var(--surface))' }}
                >
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t('user.deleteConfirmPrompt')}
                  </p>
                  <Input
                    value={deleteText}
                    onChange={(e) => setDeleteText(e.target.value)}
                    placeholder="delete"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => { setDeleteOpen(false); setDeleteText('') }}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      disabled={deleteText.toLowerCase() !== 'delete' || deleting}
                      onClick={handleDeleteAccount}
                    >
                      {deleting ? t('user.deleting') : t('user.confirmDeletion')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: color ?? 'var(--text-muted)' }}>
      {children}
    </h2>
  )
}

function Row({ label, children, first }: { label: string; children: React.ReactNode; first?: boolean }) {
  return (
    <div
      className="flex items-start justify-between gap-4 py-3"
      style={first ? undefined : { borderTop: '1px solid var(--border)' }}
    >
      <p className="text-xs font-medium shrink-0 pt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="text-right">{children}</div>
    </div>
  )
}

function StorageStat({ label, value, limit }: { label: string; value: number; limit: number }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
        {value} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ {limit}</span>
      </p>
    </div>
  )
}

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className="relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-40"
      style={{ backgroundColor: checked ? 'var(--accent)' : 'var(--border)' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  )
}
