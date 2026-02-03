import { NextResponse } from 'next/server'
import { supabaseService, TABLES } from '@/lib/supabase'
import { apiError, apiSuccess, ensureSupabaseConfigured } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

function parseDateRange(searchParams: URLSearchParams): { start: string | null; end: string | null } {
  const start = searchParams.get('start')?.trim() || null
  const end = searchParams.get('end')?.trim() || null
  return {
    start: start && DATE_REGEX.test(start) ? start : null,
    end: end && DATE_REGEX.test(end) ? end : null
  }
}

/** 新成員編號門檻：此編號（含）以後視為新成員，其總會議數僅計「有簽到的會議」 */
const NEW_MEMBER_ID_CUTOFF = 76
/** 新成員起始會議日：8/14 起的會議才計入新成員的總會議（此前尚未入會） */
const NEW_MEMBER_MEETING_START = '2024-08-14'

/**
 * 獲取會員出席統計（可選日期區間）
 * Query: start=YYYY-MM-DD, end=YYYY-MM-DD（可選；未帶則全期間）
 *
 * 【統計口徑】以「簽到記錄」為準；每人每日只計一次。
 * - 舊成員（編號 < 76）：總會議數 = 區間內所有會議數
 * - 新成員（編號 >= 76）：總會議數 = 僅計有簽到過的會議（且須為 8/14 之後），未簽到的不算
 */
export async function GET(request: Request) {
  const envErr = ensureSupabaseConfigured()
  if (envErr) return envErr
  try {
    const { searchParams } = new URL(request.url)
    const { start, end } = parseDateRange(searchParams)

    // 1. 取得所有會員
    const membersResult = await supabaseService.from(TABLES.MEMBERS).select('id').order('id', { ascending: true })
    const { data: members, error: membersError } = membersResult

    if (membersError) {
      console.error('Error fetching members:', membersError)
      return apiError('獲取會員列表失敗', 500)
    }

    // 2. 分批取得所有簽到（Supabase 預設 1000 筆限制）
    const PAGE_SIZE = 1000
    let allCheckins: any[] = []
    let offset = 0
    let hasMore = true
    while (hasMore) {
      const checkinsResult = await supabaseService
        .from(TABLES.CHECKINS)
        .select('member_id, meeting_date, status, message')
        .order('meeting_date', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)

      if (checkinsResult.error) {
        console.error('Error fetching checkins:', checkinsResult.error)
        return apiError('獲取簽到記錄失敗', 500)
      }
      const page = checkinsResult.data || []
      allCheckins = allCheckins.concat(page)
      hasMore = page.length >= PAGE_SIZE
      offset += PAGE_SIZE
    }

    // 依區間篩選簽到（無 start/end 則全期間）
    const checkins = (allCheckins || []).filter((c: { meeting_date: string }) => {
      const d = c.meeting_date
      if (!d) return false
      if (start && d < start) return false
      if (end && d > end) return false
      return true
    })

    const meetingDatesFromCheckins = new Set<string>()
    for (const c of checkins) {
      if (c.meeting_date) meetingDatesFromCheckins.add(c.meeting_date)
    }
    const actualMeetingDates = Array.from(meetingDatesFromCheckins).sort()
    const totalMeetings = actualMeetingDates.length

    if (totalMeetings === 0) {
      return apiSuccess({
        totalMeetings: 0,
        memberStats: {}
      })
    }

    const memberIds = (members || []).map(m => m.id)
    if (memberIds.length === 0) {
      return apiSuccess({
        totalMeetings: 0,
        memberStats: {}
      })
    }

    // 2. 計算每個會員的出席統計
    const memberStats: Record<number, { 
      total: number
      present: number
      late: number
      proxy: number
      absent: number
      rate: number 
    }> = {}

    const actualMeetingDatesSet = new Set(actualMeetingDates)

    // 同一會員、同一會議日期只計一次出席（避免重複簽到紀錄造成多算）
    const countedKey = (memberId: number, meetingDate: string) => `${memberId}-${meetingDate}`

    // 新成員：僅計「有簽到過的會議」為總會議；紀錄每人每場的 meeting_date 集合
    const memberMeetingDatesWithCheckin = new Map<number, Set<string>>()

    // 統計每個會員的各類出席次數
    const seen = new Set<string>()
    for (const checkin of checkins || []) {
      if (!actualMeetingDatesSet.has(checkin.meeting_date)) continue

      const memberId = checkin.member_id
      const meetingDate = checkin.meeting_date

      const key = countedKey(memberId, meetingDate)
      if (seen.has(key)) continue
      seen.add(key)

      const isNewMember = memberId >= NEW_MEMBER_ID_CUTOFF
      const meetingAfterStart = meetingDate >= NEW_MEMBER_MEETING_START

      if (!memberStats[memberId]) {
        memberStats[memberId] = {
          total: 0,
          present: 0,
          late: 0,
          proxy: 0,
          absent: 0,
          rate: 0
        }
      }
      if (!memberMeetingDatesWithCheckin.has(memberId)) {
        memberMeetingDatesWithCheckin.set(memberId, new Set())
      }

      // 新成員：僅 8/14 後有簽到的會議才計入總會議
      if (isNewMember && meetingAfterStart) {
        memberMeetingDatesWithCheckin.get(memberId)!.add(meetingDate)
      }

      const status = checkin.status || 'absent'
      const message = (checkin.message || '').toLowerCase()

      const isProxy = message.includes('代理') || message.includes('代') || message.includes('替') || message.includes('proxy')

      if (status === 'present' || status === 'early' || status === 'proxy') {
        memberStats[memberId].present++
        if (status === 'proxy' || isProxy) memberStats[memberId].proxy++
      } else if (status === 'late') {
        memberStats[memberId].present++
        memberStats[memberId].late++
        if (isProxy) memberStats[memberId].proxy++
      } else if (status === 'early_leave') {
        memberStats[memberId].present++
        if (isProxy) memberStats[memberId].proxy++
      }
    }

    // 初始化未出現過的會員，並設定總會議數
    for (const memberId of memberIds) {
      if (!memberStats[memberId]) {
        memberStats[memberId] = { total: 0, present: 0, late: 0, proxy: 0, absent: 0, rate: 0 }
      }
      const stat = memberStats[memberId]
      if (memberId >= NEW_MEMBER_ID_CUTOFF) {
        stat.total = memberMeetingDatesWithCheckin.get(memberId)?.size ?? 0
      } else {
        stat.total = totalMeetings
      }
      stat.absent = Math.max(0, stat.total - stat.present)
      stat.rate = stat.total > 0
        ? Math.max(0, Math.min(100, (stat.present / stat.total) * 100))
        : 0
    }

    // 轉換為數組格式，方便前端使用
    const memberStatsArray = Object.entries(memberStats).map(([memberId, stats]) => ({
      memberId: parseInt(memberId),
      ...stats
    }))

    return apiSuccess({
      totalMeetings,
      memberStats,
      data: memberStatsArray,
      dateRange: start && end ? { start, end } : null
    })

  } catch (error) {
    console.error('Error calculating member attendance:', error)
    return apiError(
      `計算失敗：${error instanceof Error ? error.message : '未知錯誤'}`,
      500
    )
  }
}
