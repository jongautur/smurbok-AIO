'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'

interface TransferVehicleModalProps {
  vehicleId: string
  onClose: () => void
}

interface PendingTransfer {
  id: string
  toEmail: string | null
  expiresAt: string
  createdAt: string
}

export function TransferVehicleModal({ vehicleId, onClose }: TransferVehicleModalProps) {
  const t = useTranslations('vehicles')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [transfers, setTransfers] = useState<PendingTransfer[]>([])
  const [cancelling, setCancelling] = useState<string | null>(null)

  useEffect(() => {
    api.get<PendingTransfer[]>(`/vehicles/${vehicleId}/transfers`)
      .then(r => setTransfers(r.data))
      .catch(() => {})
  }, [vehicleId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      await api.post(`/vehicles/${vehicleId}/transfer`, { toEmail: email.trim() })
      setSentTo(email.trim())
      const r = await api.get<PendingTransfer[]>(`/vehicles/${vehicleId}/transfers`)
      setTransfers(r.data)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function cancelTransfer(transferId: string) {
    setCancelling(transferId)
    try {
      await api.delete(`/vehicles/${vehicleId}/transfers/${transferId}`)
      setTransfers((prev) => prev.filter((t) => t.id !== transferId))
    } catch {}
    setCancelling(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{t('transferTitle')}</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('transferHint')}</p>

        {sentTo ? (
          <div className="rounded-lg p-4 text-sm" style={{ backgroundColor: 'var(--overlay)', color: 'var(--text-primary)' }}>
            {t('transferSent', { email: sentTo })}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{t('transferEmail')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
                style={{
                  backgroundColor: 'var(--bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t('transferSending') : t('transferSend')}
            </Button>
          </form>
        )}

        {/* Pending transfers */}
        <div>
          <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>{t('transferPending')}</p>
          {transfers.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('transferNoPending')}</p>
          ) : (
            <div className="space-y-2">
              {transfers.map((tf) => (
                <div key={tf.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ border: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {t('transferTo', { email: tf.toEmail ?? '—' })}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {t('transferExpires', { date: new Date(tf.expiresAt).toLocaleDateString() })}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={cancelling === tf.id}
                    onClick={() => cancelTransfer(tf.id)}
                  >
                    {t('transferCancel')}
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
