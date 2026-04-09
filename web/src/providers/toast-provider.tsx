'use client'

import { createContext, useCallback, useContext, useState } from 'react'

type ToastType = 'success' | 'error'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContext {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContext>({ toast: () => {} })

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm text-white font-medium
              transition-all animate-in slide-in-from-bottom-2
              ${t.type === 'success' ? 'bg-gray-900' : 'bg-red-600'}`}
          >
            {t.type === 'success' ? '✓ ' : '✕ '}{t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
