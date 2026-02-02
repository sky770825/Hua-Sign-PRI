'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Meeting } from '@/types'

interface UseMeetingsResult {
  meetings: Meeting[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMeetings(): UseMeetingsResult {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMeetings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/meetings')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '取得會議失敗')
      setMeetings(data.meetings ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '取得會議失敗')
      setMeetings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  return { meetings, loading, error, refetch: fetchMeetings }
}
