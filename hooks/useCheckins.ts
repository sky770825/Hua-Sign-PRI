'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CheckinRecord } from '@/types'

interface MeetingInfo {
  id?: number
  date: string
  status: string
}

interface UseCheckinsResult {
  checkins: CheckinRecord[]
  meeting: MeetingInfo | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCheckins(date: string): UseCheckinsResult {
  const [checkins, setCheckins] = useState<CheckinRecord[]>([])
  const [meeting, setMeeting] = useState<MeetingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCheckins = useCallback(async () => {
    if (!date) {
      setCheckins([])
      setMeeting(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/checkins?date=${date}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '取得簽到失敗')
      setCheckins(data.checkins ?? [])
      setMeeting(data.meeting ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '取得簽到失敗')
      setCheckins([])
      setMeeting(null)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchCheckins()
  }, [fetchCheckins])

  return { checkins, meeting, loading, error, refetch: fetchCheckins }
}
