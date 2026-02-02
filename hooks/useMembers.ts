'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Member } from '@/types'

interface UseMembersResult {
  members: Member[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMembers(): UseMembersResult {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/members')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '取得會員失敗')
      setMembers(data.members ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '取得會員失敗')
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  return { members, loading, error, refetch: fetchMembers }
}
