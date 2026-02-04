import { NextResponse } from 'next/server'
import { supabaseService, TABLES } from '@/lib/supabase'
import { apiError, apiSuccess, ensureSupabaseConfigured } from '@/lib/api-utils'
import { handleDatabaseError } from '@/lib/api-utils'
import { withCache, clearCache } from '@/lib/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const CONTEXT_CACHE_KEY = 'attendance:context'
const CONTEXT_CACHE_TTL = 45 * 1000 // 45 秒短期快取

/**
 * 出席管理頁面情境 API：一次回傳 members、meetings、checkinsByDate、meetingStats
 * 供前端只打 1 次請求即可渲染出席管理（當日簽到從 checkinsByDate[date] 取）
 * Query: ?fresh=1 強制跳過快取
 */
export async function GET(request: Request) {
  const envErr = ensureSupabaseConfigured()
  if (envErr) return envErr

  const { searchParams } = new URL(request.url)
  const forceFresh = searchParams.get('fresh') === '1'

  const fetchContextData = async () => {
    const [membersRes, meetingsRes] = await Promise.all([
      supabaseService.from(TABLES.MEMBERS).select('id, name, profession').order('id', { ascending: true }),
      supabaseService.from(TABLES.MEETINGS).select('*').order('date', { ascending: false }),
    ])

    // Supabase 預設限制 1000 筆，需分批取得所有簽到（避免 10 月後資料被截斷）
    const PAGE_SIZE = 1000
    let checkins: any[] = []
    let offset = 0
    let hasMore = true
    while (hasMore) {
      const checkinsRes = await supabaseService
        .from(TABLES.CHECKINS)
        .select(`
          meeting_date,
          member_id,
          checkin_time,
          message,
          status,
          estate_attendance_members!inner(id, name, profession)
        `)
        .order('meeting_date', { ascending: true })
        .order('checkin_time', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (checkinsRes.error) {
        throw new Error(handleDatabaseError(checkinsRes.error) || '獲取簽到失敗')
      }
      const page = checkinsRes.data || []
      checkins = checkins.concat(page)
      hasMore = page.length >= PAGE_SIZE
      offset += PAGE_SIZE
    }

    if (membersRes.error) {
      throw new Error('獲取會員失敗')
    }
    if (meetingsRes.error) {
      throw new Error('獲取會議失敗')
    }

    const members = membersRes.data || []
    const meetings = meetingsRes.data || []

    const byDate: Record<string, Array<{
      member_id: number
      checkin_time: string
      message: string | null
      status: string
      name: string
      profession: string
    }>> = {}
    const meetingStats: Record<string, number> = {}
    const seenPerDate = new Map<string, Set<number>>()

    for (const c of checkins) {
      const date = (c as any).meeting_date
      if (!date) continue
      const memberId = (c as any).member_id
      if (!byDate[date]) byDate[date] = []
      if (!seenPerDate.has(date)) seenPerDate.set(date, new Set())
      const seen = seenPerDate.get(date)!
      if (seen.has(memberId)) continue
      seen.add(memberId)

      const member = Array.isArray((c as any).estate_attendance_members)
        ? (c as any).estate_attendance_members[0]
        : (c as any).estate_attendance_members
      byDate[date].push({
        member_id: memberId,
        checkin_time: (c as any).checkin_time,
        message: (c as any).message,
        status: (c as any).status ?? 'absent',
        name: member?.name ?? '',
        profession: member?.profession ?? '',
      })
    }

    for (const date of Object.keys(byDate)) {
      meetingStats[date] = byDate[date].length
    }
    for (const m of meetings) {
      const d = (m as any).date
      if (d && meetingStats[d] === undefined) meetingStats[d] = 0
    }

    return { members, meetings, checkinsByDate: byDate, meetingStats }
  }

  try {
    if (forceFresh) {
      clearCache(CONTEXT_CACHE_KEY)
    }
    const data = await withCache(
      CONTEXT_CACHE_KEY,
      fetchContextData,
      CONTEXT_CACHE_TTL
    )
    return apiSuccess(data)
  } catch (err) {
    console.error('Error in attendance context:', err)
    return apiError(err instanceof Error ? err.message : '取得情境失敗', 500)
  }
}
