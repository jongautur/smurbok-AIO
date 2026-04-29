'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Building2, CheckCircle, XCircle, LogIn } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/providers/auth-provider'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { lp } from '@/lib/locale-path'

type InviteInfo = {
  orgId: string
  orgName: string
  role: string
  email: string
}

type Stage = 'loading' | 'invalid' | 'valid' | 'accepted'

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  DRIVER: 'Driver',
  TECHNICIAN: 'Technician',
  VIEWER: 'Viewer',
}

export default function InviteAcceptPage() {
  const t = useTranslations()
  const { locale } = useParams<{ locale: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const { appUser, loading: authLoading } = useAuth()

  const [stage, setStage] = useState<Stage>('loading')
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (!token) { setStage('invalid'); return }
    api.get<InviteInfo>(`/organizations/invites/check?token=${encodeURIComponent(token)}`)
      .then(({ data }) => { setInfo(data); setStage('valid') })
      .catch(() => setStage('invalid'))
  }, [token])

  async function handleAccept() {
    setAccepting(true)
    try {
      await api.post('/organizations/invites/accept', { token })
      setStage('accepted')
    } catch {
      setAccepting(false)
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
            title={t('invite.invalid')}
            body={t('invite.invalidBody')}
          >
            <Link href={lp(locale, '/')}>
              <Button variant="secondary">{t('invite.goHome')}</Button>
            </Link>
          </Centred>
        )}

        {!isLoading && stage === 'valid' && info && (
          <div className="space-y-5">
            <Centred
              icon={<Building2 size={28} />}
              iconColor="var(--accent)"
              title={t('invite.title')}
              body={t('invite.subtitle')}
            />

            <div
              className="rounded-xl p-4 space-y-2 border"
              style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {info.orgName}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t('invite.role')}: <span style={{ color: 'var(--text-primary)' }}>{ROLE_LABELS[info.role] ?? info.role}</span>
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {info.email}
              </p>
            </div>

            {!appUser ? (
              <div className="space-y-3 text-center">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('invite.loginRequiredBody')}
                </p>
                <Link href={lp(locale, `/login?next=${encodeURIComponent(`/invites/accept?token=${token}`)}`)} className="block">
                  <Button className="w-full">
                    <LogIn size={15} /> {t('invite.loginRequired')}
                  </Button>
                </Link>
              </div>
            ) : (
              <Button className="w-full" disabled={accepting} onClick={handleAccept}>
                {accepting ? t('invite.accepting') : t('invite.accept')}
              </Button>
            )}
          </div>
        )}

        {!isLoading && stage === 'accepted' && (
          <Centred
            icon={<CheckCircle size={28} />}
            iconColor="var(--accent)"
            title={t('invite.accepted')}
            body={t('invite.acceptedBody')}
          >
            <Button onClick={() => router.push(lp(locale, '/dashboard'))}>
              {t('invite.goHome')}
            </Button>
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
