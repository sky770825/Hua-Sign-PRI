'use client'

import { useState, useEffect, useCallback } from 'react'
import type { WinnerRecord } from '@/types'

interface UseWinnersResult {
  winners: WinnerRecord[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useWinners(date?: string): UseWinnersResult {
  const [winners, setWinners] = useState<WinnerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWinners = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = date
        ? `/api/lottery/winners?date=${date}&_t=${Date.now()}`
        : `/api/lottery/winners?_t=${Date.now()}`
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '取得中獎記錄失敗')
      setWinners(data.winners ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '取得中獎記錄失敗')
      setWinners([])
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchWinners()
  }, [fetchWinners])

  return { winners, loading, error, refetch: fetchWinners }
}
