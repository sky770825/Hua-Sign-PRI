import { NextResponse } from 'next/server'
import { supabaseService, TABLES } from '@/lib/supabase'
import { apiError, apiSuccess, ensureSupabaseConfigured } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
/** 查詢區間最多 1 年，避免超長查詢 */
const MAX_RANGE_DAYS = 365

function capDateRange(start: string | null, end: string | null): { start: string; end: string } {
  const today = new Date().toISOString().split('T')[0]
  const d = new Date()
  d.setDate(d.getDate() - MAX_RANGE_DAYS)
  const defaultStart = d.toISOString().split('T')[0]
  let s = start && DATE_REGEX.test(start) ? start : defaultStart
  let e = end && DATE_REGEX.test(end) ? end : today
  const startDate = new Date(s)
  const endDate = new Date(e)
  const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays > MAX_RANGE_DAYS) {
    const capped = new Date(endDate)
    capped.setDate(capped.getDate() - MAX_RANGE_DAYS)
    s = capped.toISOString().split('T')[0]
  }
  return { start: s, end: e }
}

/** 新成員編號門檻：此編號（含）以後視為新成員，總會議數僅計「有簽到的會議」 */
const NEW_MEMBER_ID_CUTOFF = 76
/** 新成員起始會議日：8/14 起的會議才計入新成員的總會議 */
const NEW_MEMBER_MEETING_START = '2024-08-14'

type RiskLevel = 'high' | 'medium' | 'low' | null
type Trend = 'up' | 'flat' | 'down' | null

export interface CareListItem {
  memberId: number
  name: string
  profession: string
  total: number
  present: number
  absent: number
  rate: number
  consecutiveAbsences: number
  lastAttendanceDate: string | null
  daysSinceLastAttendance: number | null
  trend: Trend
  riskLevel: RiskLevel
}

function parseDateRange(searchParams: URLSearchParams): { start: string | null; end: string | null } {
  const start = searchParams.get('start')?.trim() || null
  const end = searchParams.get('end')?.trim() || null
  return {
    start: start && DATE_REGEX.test(start) ? start : null,
    end: end && DATE_REGEX.test(end) ? end : null
  }
}

function computeRiskLevel(
  rate: number,
  total: number,
  consecutiveAbsences: number,
  daysSinceLast: number | null
): RiskLevel {
  // 總會議數過少不列入風險（新進會員，或尚無簽到紀錄）
  if (total < 3) return null

  // 高風險
  if (consecutiveAbsences >= 4) return 'high'
  if (rate < 15 && total >= 10) return 'high'
  if (daysSinceLast !== null && daysSinceLast > 60) return 'high'

  // 中風險
  if (consecutiveAbsences >= 2 && consecutiveAbsences <= 3) return 'medium'
  if (rate >= 15 && rate < 35) return 'medium'
  if (daysSinceLast !== null && daysSinceLast >= 30 && daysSinceLast <= 60) return 'medium'

  // 低風險
  if (consecutiveAbsences === 1) return 'low'
  if (rate >= 35 && rate < 50) return 'low'

  return null
}

function computeTrend(
  firstHalfRate: number,
  secondHalfRate: number,
  firstHalfTotal: number,
  secondHalfTotal: number
): Trend {
  if (firstHalfTotal < 3 || secondHalfTotal < 3) return null
  const diff = secondHalfRate - firstHalfRate
  if (diff > 5) return 'up'
  if (diff < -5) return 'down'
  return 'flat'
}

/**
 * 關注名單 API
 * Query: start=YYYY-MM-DD, end=YYYY-MM-DD（可選；未帶則全期間）
 */
export async function GET(request: Request) {
  const envErr = ensureSupabaseConfigured()
  if (envErr) return envErr

  try {
    const { searchParams } = new URL(request.url)
    const { start: rawStart, end: rawEnd } = parseDateRange(searchParams)
    const { start, end } = capDateRange(rawStart, rawEnd)

    const today = new Date().toISOString().split('T')[0]

    // 1. 取得所有會員
    const { data: members, error: membersError } = await supabaseService
      .from(TABLES.MEMBERS)
      .select('id, name, profession')
      .order('id', { ascending: true })

    if (membersError) {
      console.error('Error fetching members:', membersError)
      return apiError('獲取會員列表失敗', 500)
    }

    // 2. 取得所有簽到
    const PAGE_SIZE = 1000
    let allCheckins: { member_id: number; meeting_date: string }[] = []
    let offset = 0
    let hasMore = true
    while (hasMore) {
      const { data: page, error } = await supabaseService
        .from(TABLES.CHECKINS)
        .select('member_id, meeting_date')
        .order('meeting_date', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)

      if (error) {
        console.error('Error fetching checkins:', error)
        return apiError('獲取簽到記錄失敗', 500)
      }
      const rows = page || []
      allCheckins = allCheckins.concat(rows)
      hasMore = rows.length >= PAGE_SIZE
      offset += PAGE_SIZE
    }

    // 依區間篩選
    const checkins = allCheckins.filter(c => {
      const d = c.meeting_date
      if (!d) return false
      if (start && d < start) return false
      if (end && d > end) return false
      return true
    })

    // 取得所有會議日期（依簽到記錄推得），降序（最近在前）
    const meetingDatesSet = new Set<string>()
    for (const c of checkins) {
      if (c.meeting_date) meetingDatesSet.add(c.meeting_date)
    }
    const allMeetingDates = Array.from(meetingDatesSet).sort()
    const meetingDatesDesc = [...allMeetingDates].reverse()
    const totalMeetings = allMeetingDates.length

    if (totalMeetings === 0) {
      return apiSuccess({
        careList: [],
        totalMeetings: 0,
        summary: { high: 0, medium: 0, low: 0 }
      })
    }

    // 每人每場只計一次
    const memberAttendanceByDate = new Map<number, Set<string>>()
    for (const c of checkins) {
      const mid = c.member_id
      const date = c.meeting_date
      if (!date) continue
      if (!memberAttendanceByDate.has(mid)) {
        memberAttendanceByDate.set(mid, new Set())
      }
      memberAttendanceByDate.get(mid)!.add(date)
    }

    const midPoint = Math.floor(allMeetingDates.length / 2)
    const firstHalfDates = new Set(allMeetingDates.slice(0, midPoint))
    const secondHalfDates = new Set(allMeetingDates.slice(midPoint))

    const careList: CareListItem[] = []

    for (const member of members || []) {
      const mid = member.id
      const attendedDates = memberAttendanceByDate.get(mid) || new Set<string>()

      const present = attendedDates.size
      let total: number
      if (mid >= NEW_MEMBER_ID_CUTOFF) {
        total = Array.from(attendedDates).filter(d => d >= NEW_MEMBER_MEETING_START).length
      } else {
        total = totalMeetings
      }
      const absent = Math.max(0, total - present)
      const rate = total > 0 ? (present / total) * 100 : 0

      // 連續缺席：從最近一場例會往前數
      let consecutiveAbsences = 0
      for (const d of meetingDatesDesc) {
        if (attendedDates.has(d)) break
        consecutiveAbsences++
      }

      // 最後出席日
      const sortedAttended = Array.from(attendedDates).sort().reverse()
      const lastAttendanceDate = sortedAttended[0] || null
      let daysSinceLastAttendance: number | null = null
      if (lastAttendanceDate) {
        const last = new Date(lastAttendanceDate).getTime()
        const now = new Date(today).getTime()
        daysSinceLastAttendance = Math.floor((now - last) / (24 * 60 * 60 * 1000))
      } else {
        // 從未出席過，用最遠的會議日期算
        const firstMeeting = allMeetingDates[0]
        if (firstMeeting) {
          const first = new Date(firstMeeting).getTime()
          const now = new Date(today).getTime()
          daysSinceLastAttendance = Math.floor((now - first) / (24 * 60 * 60 * 1000))
        }
      }

      // 趨勢（會期前半 vs 後半）
      let firstHalfPresent = 0
      let secondHalfPresent = 0
      for (const d of Array.from(attendedDates)) {
        if (firstHalfDates.has(d)) firstHalfPresent++
        if (secondHalfDates.has(d)) secondHalfPresent++
      }
      const firstHalfTotal = firstHalfDates.size
      const secondHalfTotal = secondHalfDates.size
      const firstHalfRate = firstHalfTotal > 0 ? (firstHalfPresent / firstHalfTotal) * 100 : 0
      const secondHalfRate = secondHalfTotal > 0 ? (secondHalfPresent / secondHalfTotal) * 100 : 0
      const trend = computeTrend(firstHalfRate, secondHalfRate, firstHalfTotal, secondHalfTotal)

      const riskLevel = computeRiskLevel(rate, total, consecutiveAbsences, daysSinceLastAttendance)

      careList.push({
        memberId: mid,
        name: member.name || '',
        profession: member.profession || '-',
        total,
        present,
        absent,
        rate,
        consecutiveAbsences,
        lastAttendanceDate,
        daysSinceLastAttendance,
        trend,
        riskLevel
      })
    }

    // 只保留有風險等級的
    const filtered = careList.filter(c => c.riskLevel !== null)
    const summary = {
      high: filtered.filter(c => c.riskLevel === 'high').length,
      medium: filtered.filter(c => c.riskLevel === 'medium').length,
      low: filtered.filter(c => c.riskLevel === 'low').length
    }

    // 排序：高風險 > 中風險 > 低風險，同級依連續缺席多、出席率低
    filtered.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      const aOrd = a.riskLevel ? order[a.riskLevel] : 3
      const bOrd = b.riskLevel ? order[b.riskLevel] : 3
      if (aOrd !== bOrd) return aOrd - bOrd
      if (a.consecutiveAbsences !== b.consecutiveAbsences) return b.consecutiveAbsences - a.consecutiveAbsences
      return a.rate - b.rate
    })

    return apiSuccess({
      careList: filtered,
      totalMeetings,
      summary,
      dateRange: start && end ? { start, end } : null
    })
  } catch (error) {
    console.error('Error computing care list:', error)
    return apiError(
      `計算失敗：${error instanceof Error ? error.message : '未知錯誤'}`,
      500
    )
  }
}
