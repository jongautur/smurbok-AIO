'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X, Copy, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'

interface ShareVehicleModalProps {
  vehicleId: string
  onClose: () => void
}

interface ShareToken {
  id: string
  label: string | null
  expiresAt: string | null
  createdAt: string
}

export function ShareVehicleModal({ vehicleId, onClose }: ShareVehicleModalProps) {
  const t = useTranslations('vehicles')
  const [tokens, setTokens] = useState<ShareToken[]>([])
  const [label, setLabel] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [creating, setCreating] = useState(false)
  const [newShareUrl, setNewShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<ShareToken[]>(`/vehicles/${vehicleId}/share`)
      .then(r => setTokens(r.data))
      .catch(() => {})
  }, [vehicleId])

  async function createLink(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const r = await api.post<{ shareUrl: string; token: string }>(`/vehicles/${vehicleId}/share`, {
        label: label.trim() || undefined,
        expiresAt: expiresAt || undefined,
      })
      setNewShareUrl(r.data.shareUrl)
      setLabel('')
      setExpiresAt('')
      const listR = await api.get<ShareToken[]>(`/vehicles/${vehicleId}/share`)
      setTokens(listR.data)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Error')
    } finally {
      setCreating(false)
    }
  }

  async function revokeToken(tokenId: string) {
    if (!window.confirm(t('shareRevokeConfirm'))) return
    setRevoking(tokenId)
    try {
      await api.delete(`/vehicles/${vehicleId}/share/${tokenId}`)
      setTokens((prev) => prev.filter((t) => t.id !== tokenId))
      if (newShareUrl) setNewShareUrl(null)
    } catch {}
    setRevoking(null)
  }

  function copyLink() {
    if (!newShareUrl) return
    navigator.clipboard.writeText(newShareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{t('shareTitle')}</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('shareHint')}</p>

        {/* Create link */}
        <form onSubmit={createLink} className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('shareCreateLink')}</p>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{t('shareLabel')}</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{t('shareExpiry')}</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
          <Button type="submit" disabled={creating} className="w-full">
            {creating ? '...' : t('shareCreateLink')}
          </Button>
        </form>

        {/* Newly created link */}
        {newShareUrl && (
          <div className="rounded-lg p-3 space-y-2" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--overlay)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{t('shareCopyLink')}</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={newShareUrl}
                className="flex-1 rounded-lg px-3 py-2 text-xs border outline-none min-w-0"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                onFocus={(e) => e.target.select()}
              />
              <Button variant="secondary" size="sm" onClick={copyLink}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? t('shareCopied') : t('shareCopyLink')}
              </Button>
            </div>
          </div>
        )}

        {/* Active tokens */}
        <div>
          <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>{t('shareActiveLinks')}</p>
          {tokens.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('shareNoLinks')}</p>
          ) : (
            <div className="space-y-2">
              {tokens.map((tk) => (
                <div key={tk.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ border: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{tk.label ?? '—'}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {tk.expiresAt
                        ? `${t('transferExpires', { date: new Date(tk.expiresAt).toLocaleDateString() })}`
                        : new Date(tk.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={revoking === tk.id}
                    onClick={() => revokeToken(tk.id)}
                    style={{ color: 'var(--danger)' }}
                  >
                    {t('shareRevoke')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
