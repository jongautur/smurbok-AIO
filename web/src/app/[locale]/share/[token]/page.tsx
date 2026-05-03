'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Printer } from 'lucide-react'

interface SharedVehicle {
  make: string
  model: string
  year: number
  licensePlate: string
  vin: string | null
  color: string | null
  fuelType: string
}

interface ServiceRecord {
  id: string
  types: string[]
  customType: string | null
  mileage: number
  date: string
  cost: any
  shop: string | null
  description: string | null
}

interface MileageLog {
  id: string
  mileage: number
  date: string
  note: string | null
}

interface Expense {
  id: string
  category: string
  amount: number
  date: string
  description: string | null
  litres: any
}

interface SharedDoc {
  id: string
  label: string
  type: string
  fileSizeBytes: number | null
  createdAt: string
}

interface SharedData {
  vehicle: SharedVehicle
  serviceRecords: ServiceRecord[]
  mileageLogs: MileageLog[]
  expenses: Expense[]
  documents: SharedDoc[]
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SharedVehiclePage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<SharedData | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? ''
    fetch(`${apiUrl}/vehicles/shared/${token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg, #f9fafb)' }}>
        <p className="text-sm" style={{ color: '#6b7280' }}>Loading...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ backgroundColor: 'var(--bg, #f9fafb)' }}>
        <p className="text-xl font-semibold text-gray-800 mb-2">Link invalid or expired</p>
        <p className="text-sm text-gray-500">This share link is invalid or has expired.</p>
      </div>
    )
  }

  const v = data.vehicle

  // Expense totals by category
  const expByCategory: Record<string, number> = {}
  for (const e of data.expenses) {
    expByCategory[e.category] = (expByCategory[e.category] ?? 0) + Number(e.amount)
  }
  const totalExpenses = Object.values(expByCategory).reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {v.year} {v.make} {v.model}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{v.licensePlate}{v.vin ? ` · VIN: ${v.vin}` : ''}</p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 print:hidden"
          >
            <Printer size={15} />
            Print
          </button>
        </div>

        {/* Service Records */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Service Records ({data.serviceRecords.length})</h2>
          {data.serviceRecords.length === 0 ? (
            <p className="text-sm text-gray-400">No service records</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Service</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Mileage</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Shop</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.serviceRecords.map((sr, i) => (
                    <tr key={sr.id} className={i > 0 ? 'border-t border-gray-100' : ''}>
                      <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{fmtDate(sr.date)}</td>
                      <td className="px-4 py-2 text-gray-900 font-medium">{sr.customType ?? sr.types.join(', ')}</td>
                      <td className="px-4 py-2 text-gray-600">{sr.mileage.toLocaleString()} km</td>
                      <td className="px-4 py-2 text-gray-500">{sr.shop ?? '—'}</td>
                      <td className="px-4 py-2 text-right text-gray-700">
                        {sr.cost ? `${Number(sr.cost).toLocaleString()} kr` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Mileage History */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Mileage History ({data.mileageLogs.length})</h2>
          {data.mileageLogs.length === 0 ? (
            <p className="text-sm text-gray-400">No mileage logs</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Date</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Mileage</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {data.mileageLogs.map((ml, i) => (
                    <tr key={ml.id} className={i > 0 ? 'border-t border-gray-100' : ''}>
                      <td className="px-4 py-2 text-gray-600">{fmtDate(ml.date)}</td>
                      <td className="px-4 py-2 text-right text-gray-900 font-medium">{ml.mileage.toLocaleString()} km</td>
                      <td className="px-4 py-2 text-gray-500">{ml.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Expenses */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Expenses</h2>
          {data.expenses.length === 0 ? (
            <p className="text-sm text-gray-400">No expenses</p>
          ) : (
            <>
              {/* Category summary */}
              <div className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-3">
                {Object.entries(expByCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, total]) => (
                    <div key={cat} className="bg-white rounded-lg border border-gray-200 px-3 py-2">
                      <p className="text-xs text-gray-500 mb-1">{cat}</p>
                      <p className="text-sm font-semibold text-gray-900">{total.toLocaleString()} kr</p>
                    </div>
                  ))}
              </div>
              {totalExpenses > 0 && (
                <p className="text-sm text-gray-600 mb-3">Total: <strong>{totalExpenses.toLocaleString()} kr</strong></p>
              )}
              {/* Full expense table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Date</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Category</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expenses.map((exp, i) => (
                      <tr key={exp.id} className={i > 0 ? 'border-t border-gray-100' : ''}>
                        <td className="px-4 py-2 text-gray-600">{fmtDate(exp.date)}</td>
                        <td className="px-4 py-2 text-gray-900">{exp.category}</td>
                        <td className="px-4 py-2 text-right text-gray-700 font-medium">{Number(exp.amount).toLocaleString()} kr</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* Documents */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Documents ({data.documents.length})</h2>
          {data.documents.length === 0 ? (
            <p className="text-sm text-gray-400">No documents</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {data.documents.map((doc, i) => {
                const sizeKb = doc.fileSizeBytes ? (doc.fileSizeBytes / 1024).toFixed(0) : null
                return (
                  <div key={doc.id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {doc.type} · {fmtDate(doc.createdAt)}{sizeKb ? ` · ${sizeKb} KB` : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 pt-4 border-t border-gray-200 print:mt-8">
          Shared via Smurbók · smurbok.is
        </footer>
      </div>
    </div>
  )
}
