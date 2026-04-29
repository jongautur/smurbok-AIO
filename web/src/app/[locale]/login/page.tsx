'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { auth } from '@/lib/firebase'
import { api } from '@/lib/api'
import { useAuth } from '@/providers/auth-provider'
import { ArrowLeft, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { lp } from '@/lib/locale-path'

type Mode = 'login' | 'signup' | 'magic'

const inputCls =
  'w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-2 border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)]'

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
      {children}
    </label>
  )
}

export default function LoginPage() {
  const t = useTranslations()
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()
  const searchParams = useSearchParams()
  const { refresh } = useAuth()
  const nextPath = searchParams.get('next')

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Magic link state
  const [magicSent, setMagicSent] = useState(false)
  const [magicSessionId, setMagicSessionId] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Stop polling when we leave or unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setPassword('')
    setConfirm('')
    setMagicSent(false)
    setMagicSessionId(null)
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  async function exchangeAndRedirect(firebaseToken: string) {
    await api.post('/auth/login', { firebaseToken })
    await refresh()
    router.push(nextPath ? lp(locale, nextPath) : lp(locale, '/vehicles'))
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      await exchangeAndRedirect(await credential.user.getIdToken())
    } catch {
      setError(t('auth.loginError'))
    } finally {
      setLoading(false)
    }
  }

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError(t('auth.passwordMismatch'))
      return
    }
    setError(null)
    setLoading(true)
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      if (name.trim()) {
        await updateProfile(credential.user, { displayName: name.trim() })
      }
      await exchangeAndRedirect(await credential.user.getIdToken())
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/email-already-in-use') {
        setError(t('auth.emailInUse'))
      } else if (code === 'auth/weak-password') {
        setError(t('auth.weakPassword'))
      } else {
        setError(t('auth.signupError'))
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setError(null)
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider())
      await exchangeAndRedirect(await credential.user.getIdToken())
    } catch {
      setError(t('auth.loginError'))
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const sessionId = crypto.randomUUID()
    try {
      await api.post('/auth/magic-link', { email, sessionId })
      setMagicSessionId(sessionId)
      setMagicSent(true)
      startPolling(sessionId)
    } catch {
      setError(t('auth.loginError'))
    } finally {
      setLoading(false)
    }
  }

  function startPolling(sessionId: string) {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get<{ status: 'pending' | 'verified' }>(
          `/auth/magic-link/status?sessionId=${encodeURIComponent(sessionId)}`,
        )
        if (data.status === 'verified') {
          clearInterval(pollRef.current!)
          pollRef.current = null
          // Exchange the verified session for a cookie
          await api.post('/auth/magic-link/exchange', { sessionId })
          await refresh()
          router.push(nextPath ? lp(locale, nextPath) : lp(locale, '/vehicles'))
        }
      } catch {
        // Session expired or error — stop polling, show error
        clearInterval(pollRef.current!)
        pollRef.current = null
        setMagicSent(false)
        setMagicSessionId(null)
        setError(t('auth.magicLinkExpired'))
      }
    }, 2000)
  }

  const isSignup = mode === 'signup'
  const isMagic = mode === 'magic'

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--surface)' }}
    >
      <div className="w-full max-w-sm space-y-6">
        <div>
          <Link
            href={lp(locale, '/')}
            className="inline-flex items-center gap-1 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={14} /> {t('common.back')}
          </Link>
        </div>

        <h1
          className="text-2xl font-bold text-center"
          style={{ color: 'var(--text-primary)' }}
        >
          Smurbók
        </h1>

        {/* Mode tabs */}
        <div
          className="flex rounded-lg border overflow-hidden text-sm font-medium"
          style={{ borderColor: 'var(--border)' }}
        >
          {(['login', 'signup', 'magic'] as Mode[]).map((m) => {
            const active = mode === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className="flex-1 py-2 transition-colors"
                style={{
                  backgroundColor: active ? 'var(--accent)' : 'var(--surface-raised)',
                  color: active ? 'var(--accent-fg)' : 'var(--text-muted)',
                }}
              >
                {m === 'login' ? t('auth.login') : m === 'signup' ? t('auth.signup') : t('auth.magicLink')}
              </button>
            )
          })}
        </div>

        {/* ── Magic link flow ─────────────────────────────────────────────── */}
        {isMagic && (
          magicSent ? (
            <div className="space-y-4 text-center">
              <div
                className="mx-auto w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
              >
                <Mail size={22} />
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {t('auth.checkEmail')}
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  {t('auth.checkEmailBody', { email })}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                {t('auth.waitingForLink')}
              </div>
              <button
                type="button"
                onClick={() => { setMagicSent(false); setMagicSessionId(null); if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }}
                className="text-sm underline underline-offset-2"
                style={{ color: 'var(--text-muted)' }}
              >
                {t('auth.sendLinkAgain')}
              </button>
              {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('auth.magicLinkHint')}
              </p>
              <div>
                <Label>{t('auth.email')}</Label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
              </div>
              {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('common.loading') : t('auth.sendLink')}
              </Button>
            </form>
          )
        )}

        {/* ── Email/password forms ────────────────────────────────────────── */}
        {!isMagic && (
          <>
            <form onSubmit={isSignup ? handleEmailSignup : handleEmailLogin} className="space-y-4">
              {isSignup && (
                <div>
                  <Label>{t('auth.name')}</Label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('auth.namePlaceholder')}
                    className={inputCls}
                  />
                </div>
              )}

              <div>
                <Label>{t('auth.email')}</Label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <Label>{t('auth.password')}</Label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                />
              </div>

              {isSignup && (
                <div>
                  <Label>{t('auth.confirmPassword')}</Label>
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={inputCls}
                  />
                </div>
              )}

              {error && (
                <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? t('common.loading')
                  : isSignup
                    ? t('auth.createAccount')
                    : t('auth.login')}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: 'var(--border)' }} />
              </div>
              <div className="relative flex justify-center text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="px-2" style={{ backgroundColor: 'var(--surface)' }}>
                  {t('auth.or')}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={handleGoogleLogin}
            >
              {t(isSignup ? 'auth.signupWithGoogle' : 'auth.loginWithGoogle')}
            </Button>
          </>
        )}

        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          <Link href="terms" className="hover:underline">{t('auth.terms')}</Link>
          {' · '}
          <Link href="privacy" className="hover:underline">{t('auth.privacy')}</Link>
        </p>
      </div>
    </div>
  )
}
