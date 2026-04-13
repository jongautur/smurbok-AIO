'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const t = useTranslations()
  const router = useRouter()
  const { refresh } = useAuth()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setPassword('')
    setConfirm('')
  }

  async function exchangeAndRedirect(firebaseToken: string) {
    await api.post('/auth/login', { firebaseToken })
    await refresh()
    router.push('../vehicles')
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

  const isSignup = mode === 'signup'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-900">Smurbók</h1>

        {/* Mode tabs */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 transition-colors ${
              !isSignup ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {t('auth.login')}
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`flex-1 py-2 transition-colors ${
              isSignup ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {t('auth.signup')}
          </button>
        </div>

        <form onSubmit={isSignup ? handleEmailSignup : handleEmailLogin} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.name')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('auth.namePlaceholder')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.email')}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.password')}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.confirmPassword')}
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? t('common.loading')
              : isSignup
                ? t('auth.createAccount')
                : t('auth.login')}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs text-gray-400">
            <span className="bg-gray-50 px-2">eða</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full border border-gray-300 rounded-md py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t(isSignup ? 'auth.signupWithGoogle' : 'auth.loginWithGoogle')}
        </button>

        <p className="text-center text-xs text-gray-400">
          <Link href="terms" className="hover:underline">{t('auth.terms')}</Link>
          {' · '}
          <Link href="privacy" className="hover:underline">{t('auth.privacy')}</Link>
        </p>
      </div>
    </div>
  )
}
