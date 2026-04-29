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
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 border"
        style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
      >
        <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        {children}
      </div>
    </div>
  )
}

export const inputCls =
  'w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-2 border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)]'

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
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}
