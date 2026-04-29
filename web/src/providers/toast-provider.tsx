'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, X, RotateCcw } from 'lucide-react'

type ToastType = 'success' | 'error'

interface Toast {
  id: number
  message: string
  type: ToastType
  undo?: () => void
}

interface ToastContext {
  toast: (message: string, type?: ToastType, undo?: () => void) => void
}

const ToastContext = createContext<ToastContext>({ toast: () => {} })

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations()
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'success', undo?: () => void) => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type, undo }])
    const duration = undo ? 5000 : 3000
    setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 pl-3 pr-2 py-2.5 rounded-lg shadow-lg text-sm font-medium pointer-events-auto"
            style={{
              backgroundColor: item.type === 'error' ? '#dc2626' : '#111827',
              color: '#fff',
              minWidth: '200px',
            }}
          >
            <span className="shrink-0" style={{ color: item.type === 'error' ? '#fca5a5' : '#86efac' }}>
              {item.type === 'error' ? <X size={14} /> : <Check size={14} />}
            </span>
            <span className="flex-1">{item.message}</span>
            {item.undo && (
              <button
                onClick={() => { item.undo!(); dismiss(item.id) }}
                className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                <RotateCcw size={11} /> {t('common.undo')}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
