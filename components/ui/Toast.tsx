'use client'

import { useEffect } from 'react'

export interface ToastData {
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastProps {
  toast: ToastData | null
  onClose: () => void
  /** 自動關閉時間（毫秒），預設 5000 */
  autoCloseMs?: number
}

const iconMap = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
}

const styleMap = {
  success: 'bg-green-500/95 border-green-400 text-white',
  error: 'bg-red-500/95 border-red-400 text-white',
  info: 'bg-blue-500/95 border-blue-400 text-white',
}

export function Toast({ toast, onClose, autoCloseMs = 5000 }: ToastProps) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onClose, autoCloseMs)
    return () => clearTimeout(timer)
  }, [toast, onClose, autoCloseMs])

  if (!toast) return null

  return (
    <div
      className="fixed top-4 right-4 z-50"
      style={{ animation: 'slideIn 0.3s ease-out' }}
    >
      <div
        className={`px-6 py-4 rounded-lg shadow-2xl backdrop-blur-sm border-2 min-w-[300px] ${styleMap[toast.type]}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl flex-shrink-0">{iconMap[toast.type]}</span>
          <span className="font-semibold">{toast.message}</span>
        </div>
      </div>
    </div>
  )
}
