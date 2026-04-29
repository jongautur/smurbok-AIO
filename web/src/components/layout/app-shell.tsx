'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  Car,
  User,
  Sun,
  Moon,
  LogOut,
  Globe,
  Flag,
} from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { api } from '@/lib/api'
import { lp } from '@/lib/locale-path'
import { ReportModal } from '@/components/feedback/report-modal'

// ── Theme hook ────────────────────────────────────────────────────────────────

function useTheme() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {}
  }

  return { dark, toggle }
}

// ── AppShell ──────────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const { appUser, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { locale } = useParams<{ locale: string }>()
  const t = useTranslations()
  const { dark, toggle: toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const otherLocale = locale === 'is' ? 'en' : 'is'

  async function switchLanguage() {
    setMenuOpen(false)
    try {
      await api.patch('/auth/me/language', { language: otherLocale })
    } catch {}
    // IS has no prefix; EN has /en prefix
    const newPath = locale === 'is'
      ? `/en${pathname}`
      : pathname.replace(/^\/en/, '') || '/'
    router.push(newPath)
  }

  async function handleLogout() {
    setMenuOpen(false)
    await logout()
    router.replace(lp(locale, '/login'))
  }

  const navItems = [
    { href: lp(locale, '/dashboard'), label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: lp(locale, '/vehicles'),  label: t('nav.vehicles'),  icon: Car },
  ]

  const initials = (appUser?.displayName ?? appUser?.email ?? '?')
    .charAt(0)
    .toUpperCase()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--surface)' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 inset-x-0 h-14 z-40 flex items-center px-4 gap-3 border-b"
        style={{
          backgroundColor: 'var(--surface-raised)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Wordmark */}
        <Link
          href={lp(locale, '/dashboard')}
          className="text-[15px] font-bold shrink-0 mr-1"
          style={{ color: 'var(--text-primary)' }}
        >
          Smurbók
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 flex-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  backgroundColor: active ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : undefined,
                }}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Report button */}
        <button
          onClick={() => setReportOpen(true)}
          aria-label={t('feedback.title')}
          title={t('feedback.title')}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          <Flag size={16} />
        </button>

        {/* User menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={t('nav.userMenu')}
            aria-expanded={menuOpen}
            className="w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            {initials}
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-11 w-52 rounded-xl shadow-lg py-1 z-50 border"
              style={{
                backgroundColor: 'var(--surface-overlay)',
                borderColor: 'var(--border)',
              }}
            >
              {/* Identity */}
              <div
                className="px-3 py-2.5 border-b"
                style={{ borderColor: 'var(--border)' }}
              >
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {appUser?.displayName ?? appUser?.email}
                </p>
                {appUser?.displayName && (
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {appUser.email}
                  </p>
                )}
              </div>

              {/* Actions */}
              <MenuButton
                icon={User}
                label={t('nav.profile')}
                onClick={() => { setMenuOpen(false); router.push(lp(locale, '/user')) }}
              />
              <MenuButton
                icon={dark ? Sun : Moon}
                label={dark ? t('theme.light') : t('theme.dark')}
                onClick={() => { toggleTheme(); setMenuOpen(false) }}
              />
              <MenuButton
                icon={Globe}
                label={locale === 'is' ? 'English' : 'Íslenska'}
                onClick={switchLanguage}
              />

              <div className="border-t mt-1" style={{ borderColor: 'var(--border)' }}>
                <MenuButton
                  icon={LogOut}
                  label={t('common.logout')}
                  onClick={handleLogout}
                  destructive
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <main className="pt-14">{children}</main>

      {reportOpen && <ReportModal onClose={() => setReportOpen(false)} />}
    </div>
  )
}

// ── Dropdown menu item ────────────────────────────────────────────────────────

function MenuButton({
  icon: Icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:opacity-80"
      style={{ color: destructive ? 'var(--danger)' : 'var(--text-primary)' }}
    >
      <Icon size={15} className="shrink-0" />
      {label}
    </button>
  )
}
