'use client'

interface ModalProps {
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ onClose, title, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export const inputCls =
  'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
