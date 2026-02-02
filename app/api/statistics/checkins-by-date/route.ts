import { NextResponse } from 'next/server'
import { supabaseService, TABLES } from '@/lib/supabase'
import { handleDatabaseError } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

/**
 * 一次取得所有會議日期的簽到記錄（依 meeting_date 分組）
 * 用於出席管理頁面，避免對每個日期各發一次 /api/checkins?date=... 造成 N+1 延遲
 */
export async function GET() {
  try {
    const { data: checkins, error } = await supabaseService
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

    if (error) {
      console.error('Error fetching checkins:', error)
      return NextResponse.json(
        { error: handleDatabaseError(error) || 'Failed to fetch checkins' },
        { status: 500 }
      )
    }

    const byDate: Record<string, Array<{
      member_id: number
      checkin_time: string
      message: string | null
      status: string
      name: string
      profession: string
    }>> = {}

    for (const c of checkins || []) {
      const date = c.meeting_date
      if (!date) continue
      const member = Array.isArray((c as any).estate_attendance_members)
        ? (c as any).estate_attendance_members[0]
        : (c as any).estate_attendance_members
      if (!byDate[date]) byDate[date] = []
      byDate[date].push({
        member_id: c.member_id,
        checkin_time: c.checkin_time,
        message: c.message,
        status: c.status ?? 'absent',
        name: member?.name ?? '',
        profession: member?.profession ?? '',
      })
    }

    return NextResponse.json({
      byDate,
      dates: Object.keys(byDate).sort(),
    })
  } catch (err) {
    console.error('Error in checkins-by-date:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
