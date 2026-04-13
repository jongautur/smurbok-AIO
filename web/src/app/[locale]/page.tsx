'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/providers/auth-provider'

export default function HomePage() {
  const { appUser, loading } = useAuth()
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()

  useEffect(() => {
    if (!loading && appUser) {
      router.replace(`/${locale}/vehicles`)
    }
  }, [loading, appUser, router, locale])

  // While session check is in flight, show nothing to avoid flashing the landing page
  if (loading || appUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-bold text-gray-900">Smurbók</span>
        <Link
          href={`/${locale}/login`}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <main className="max-w-2xl mx-auto px-6 py-20 text-center space-y-6">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
          Your vehicles, all in one place
        </h1>
        <p className="text-lg text-gray-500">
          Smurbók is a personal vehicle logbook. Track service records, expenses, mileage,
          reminders, and documents for every car you own — simply and privately.
        </p>
        <Link
          href={`/${locale}/login`}
          className="inline-block bg-blue-600 text-white rounded-md px-6 py-3 text-sm font-medium hover:bg-blue-700"
        >
          Get started
        </Link>
      </main>

      {/* Features */}
      <section className="max-w-2xl mx-auto px-6 pb-20 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
        {[
          { icon: '🔧', title: 'Service records', body: 'Log every oil change, tire swap, and repair with date, mileage, and cost.' },
          { icon: '🔔', title: 'Reminders', body: 'Never miss an inspection or insurance renewal with due-date and mileage reminders.' },
          { icon: '📄', title: 'Documents', body: 'Store insurance certificates, registrations, and receipts in one secure place.' },
        ].map((f) => (
          <div key={f.title} className="space-y-2">
            <div className="text-3xl">{f.icon}</div>
            <h3 className="font-semibold text-gray-800">{f.title}</h3>
            <p className="text-sm text-gray-500">{f.body}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-6 text-center text-xs text-gray-400 space-x-4">
        <Link href={`/${locale}/terms`} className="hover:underline">Terms of Service</Link>
        <Link href={`/${locale}/privacy`} className="hover:underline">Privacy Policy</Link>
        <span>© {new Date().getFullYear()} Smurbók</span>
      </footer>
    </div>
  )
}
