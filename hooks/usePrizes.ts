'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Prize } from '@/types'

interface UsePrizesResult {
  prizes: Prize[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePrizes(): UsePrizesResult {
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPrizes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/prizes')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '取得獎品失敗')
      setPrizes(data.prizes ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '取得獎品失敗')
      setPrizes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrizes()
  }, [fetchPrizes])

  return { prizes, loading, error, refetch: fetchPrizes }
}
