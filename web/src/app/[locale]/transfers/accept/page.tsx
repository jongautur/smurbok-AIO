'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Car, CheckCircle, XCircle, AlertCircle, LogIn } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/providers/auth-provider'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { lp } from '@/lib/locale-path'

type TransferInfo = {
  valid: boolean
  status: string
  vehicle?: { id: string; make: string; model: string; year: number; licensePlate: string }
  toEmail?: string
  expiresAt?: string
}

type Stage = 'loading' | 'invalid' | 'valid' | 'accepted' | 'declined' | 'error'

export default function TransferAcceptPage() {
  const t = useTranslations()
  const { locale } = useParams<{ locale: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const { appUser, loading: authLoading } = useAuth()

  const [stage, setStage] = useState<Stage>('loading')
  const [info, setInfo] = useState<TransferInfo | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)

  useEffect(() => {
    if (!token) { setStage('invalid'); return }
    api.get<TransferInfo>(`/vehicles/transfers/check?token=${encodeURIComponent(token)}`)
      .then(({ data }) => {
        setInfo(data)
        setStage(data.valid ? 'valid' : 'invalid')
      })
      .catch(() => setStage('invalid'))
  }, [token])

  async function handleAccept() {
    setAccepting(true)
    try {
      await api.post('/vehicles/transfers/accept', { token })
      setStage('accepted')
    } catch {
      setAccepting(false)
    }
  }

  async function handleDecline() {
    setDeclining(true)
    try {
      await api.post('/vehicles/transfers/decline', { token })
      setStage('declined')
    } catch {
      setDeclining(false)
    }
  }

  const isLoading = stage === 'loading' || authLoading

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--surface)' }}
    >
      <div className="w-full max-w-sm space-y-6">
        {isLoading && (
          <div className="text-center space-y-4">
            <div
              className="mx-auto w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--surface-raised)' }}
            >
              <div
                className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
              />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>
          </div>
        )}

        {!isLoading && stage === 'invalid' && (
          <Centred
            icon={<XCircle size={28} />}
            iconColor="var(--danger)"
            title={info && !info.valid && info.status !== 'PENDING'
              ? t('transfer.alreadyHandled')
              : t('transfer.invalid')}
            body={info && !info.valid && info.status !== 'PENDING'
              ? t('transfer.alreadyHandledBody')
              : t('transfer.invalidBody')}
          >
            <Link href={lp(locale, '/')}>
              <Button variant="secondary" size="sm">{t('transfer.goHome')}</Button>
            </Link>
          </Centred>
        )}

        {!isLoading && stage === 'valid' && info?.vehicle && (
          <div className="space-y-5">
            <Centred
              icon={<Car size={28} />}
              iconColor="var(--accent)"
              title={t('transfer.title')}
              body={t('transfer.subtitle')}
            />

            <div
              className="rounded-xl p-4 space-y-2 border"
              style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {info.vehicle.year} {info.vehicle.make} {info.vehicle.model}
              </p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {info.vehicle.licensePlate}
              </p>
              {info.expiresAt && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t('transfer.expires')}: {new Date(info.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>

            {!appUser ? (
              <div className="space-y-3 text-center">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('transfer.loginRequiredBody')}
                </p>
                <Link href={lp(locale, `/login?next=${encodeURIComponent(`/transfers/accept?token=${token}`)}`)} className="block">
                  <Button className="w-full">
                    <LogIn size={15} /> {t('transfer.loginRequired')}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={declining || accepting}
                  onClick={handleDecline}
                >
                  {declining ? t('transfer.declining') : t('transfer.decline')}
                </Button>
                <Button
                  className="flex-1"
                  disabled={accepting || declining}
                  onClick={handleAccept}
                >
                  {accepting ? t('transfer.accepting') : t('transfer.accept')}
                </Button>
              </div>
            )}
          </div>
        )}

        {!isLoading && stage === 'accepted' && info?.vehicle && (
          <Centred
            icon={<CheckCircle size={28} />}
            iconColor="var(--accent)"
            title={t('transfer.accepted')}
            body={t('transfer.acceptedBody')}
          >
            <Button onClick={() => router.push(lp(locale, `/vehicles/${info.vehicle!.id}`))}>
              {t('transfer.goToVehicle')}
            </Button>
          </Centred>
        )}

        {!isLoading && stage === 'declined' && (
          <Centred
            icon={<AlertCircle size={28} />}
            iconColor="var(--text-muted)"
            title={t('transfer.declined')}
            body={t('transfer.declinedBody')}
          >
            <Link href={lp(locale, '/')}>
              <Button variant="secondary">{t('transfer.goHome')}</Button>
            </Link>
          </Centred>
        )}
      </div>
    </div>
  )
}

function Centred({
  icon,
  iconColor,
  title,
  body,
  children,
}: {
  icon: React.ReactNode
  iconColor: string
  title: string
  body: string
  children?: React.ReactNode
}) {
  return (
    <div className="text-center space-y-4">
      <div
        className="mx-auto w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: `color-mix(in srgb, ${iconColor} 12%, transparent)`,
          color: iconColor,
        }}
      >
        {icon}
      </div>
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>{body}</p>
      </div>
      {children && <div className="flex justify-center">{children}</div>}
    </div>
  )
}
