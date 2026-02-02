'use client'

import { useState, useCallback } from 'react'
import type { ToastData } from '@/components/ui/Toast'

export function useToast() {
  const [toast, setToast] = useState<ToastData | null>(null)

  const showToast = useCallback(
    (message: string, type: ToastData['type'] = 'info') => {
      setToast({ message, type })
    },
    []
  )

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

  return { toast, showToast, hideToast }
}
