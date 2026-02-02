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

/**
 * 獲取會員出席統計（可選日期區間）
 * Query: start=YYYY-MM-DD, end=YYYY-MM-DD（可選；未帶則全期間）
 *
 * 【統計口徑】以「簽到記錄」為準；區間內總會議數 = 有簽到的日期數，每人每日只計一次。
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

    // 初始化所有會員的統計
    for (const memberId of memberIds) {
      memberStats[memberId] = {
        total: totalMeetings,
        present: 0,
        late: 0,
        proxy: 0,
        absent: 0,
        rate: 0
      }
    }

    const actualMeetingDatesSet = new Set(actualMeetingDates)

    // 同一會員、同一會議日期只計一次出席（避免重複簽到紀錄造成多算）
    const countedKey = (memberId: number, meetingDate: string) => `${memberId}-${meetingDate}`

    // 統計每個會員的各類出席次數（僅統計屬於「有效會議」的簽到，且每人每場只計一次）
    const seen = new Set<string>()
    for (const checkin of checkins || []) {
      if (!actualMeetingDatesSet.has(checkin.meeting_date)) continue

      const memberId = checkin.member_id
      if (!memberStats[memberId]) continue

      const key = countedKey(memberId, checkin.meeting_date)
      if (seen.has(key)) continue
      seen.add(key)

      const status = checkin.status || 'absent'
      const message = (checkin.message || '').toLowerCase()

      // 判斷是否為代理出席（從留言中判斷，包含「代理」、「代」、「替」等關鍵字）
      const isProxy = message.includes('代理') || 
                     message.includes('代') || 
                     message.includes('替') ||
                     message.includes('proxy')

      if (status === 'present' || status === 'early' || status === 'proxy') {
        // 正常出席、早到、或代理出席
        memberStats[memberId].present++
        if (status === 'proxy' || isProxy) {
          memberStats[memberId].proxy++
        }
      } else if (status === 'late') {
        // 遲到
        memberStats[memberId].present++
        memberStats[memberId].late++
        if (isProxy) {
          memberStats[memberId].proxy++
        }
      } else if (status === 'early_leave') {
        // 早退（也算出席）
        memberStats[memberId].present++
        if (isProxy) {
          memberStats[memberId].proxy++
        }
      }
      // absent 狀態不需要處理，因為缺席次數 = 總會議數 - 出席次數
    }

    // 計算缺席次數和出席率
    for (const memberId of Object.keys(memberStats)) {
      const stat = memberStats[parseInt(memberId)]
      // 缺席次數 = 總會議數 - 出席次數（包含所有出席狀態）
      stat.absent = stat.total - stat.present
      // 出席率 = 出席次數 / 總會議數 * 100
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
