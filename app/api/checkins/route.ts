import { NextResponse } from 'next/server'
import { supabaseService, TABLES } from '@/lib/supabase'
import { handleDatabaseError } from '@/lib/api-utils'
import { getTodayTaipei, isThursdayInTaipei } from '@/lib/checkin-times'
import { clearCacheByPrefix } from '@/lib/cache'

// 標記為動態路由（因為使用了 request.url）
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // 獲取會議信息（使用 supabaseService 繞過 RLS）
    let { data: meetings, error: meetingError } = await supabaseService
      .from(TABLES.MEETINGS)
      .select('*')
      .eq('date', date)
      .maybeSingle()

    if (meetingError) {
      console.error('Error fetching meeting:', meetingError)
    }

    // 例會固定週四：若查詢的是「今日（台北）」且為週四但尚無會議，自動建立一筆，避免顯示「今日無例會」
    const todayTaipei = getTodayTaipei()
    if (!meetings && date === todayTaipei && isThursdayInTaipei(date)) {
      const { data: inserted, error: insertErr } = await supabaseService
        .from(TABLES.MEETINGS)
        .insert([{ date, status: 'scheduled' }])
        .select()
        .single()
      if (!insertErr && inserted) {
        meetings = inserted
        clearCacheByPrefix('meetings:')
      }
    }

    // 獲取簽到記錄（包含會員信息）
    const { data: checkins, error: checkinsError } = await supabaseService
      .from(TABLES.CHECKINS)
      .select(`
        member_id,
        checkin_time,
        message,
        status,
        estate_attendance_members!inner(id, name, profession)
      `)
      .eq('meeting_date', date)
      .order('checkin_time', { ascending: false })

    if (checkinsError) {
      console.error('Error fetching checkins:', checkinsError)
      const msg = handleDatabaseError(checkinsError)
      return NextResponse.json(
        { error: msg || 'Failed to fetch checkins' },
        { status: 500 }
      )
    }

    // 格式化返回數據
    interface CheckinWithMember {
      member_id: number
      checkin_time: string
      message: string | null
      status: string
      estate_attendance_members?: {
        id: number
        name: string
        profession: string
      } | {
        id: any
        name: any
        profession: any
      }[]
    }
    
    const formattedCheckins = (checkins || []).map((c: any) => {
      // 處理 estate_attendance_members 可能是數組或對象的情況
      const member = Array.isArray(c.estate_attendance_members) 
        ? c.estate_attendance_members[0] 
        : c.estate_attendance_members
      
      return {
        member_id: c.member_id,
        checkin_time: c.checkin_time,
        message: c.message,
        status: c.status,
        name: member?.name || '',
        profession: member?.profession || '',
      }
    })

    return NextResponse.json(
      {
        meeting: meetings || null,
        checkins: formattedCheckins,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching checkins:', error)
    const msg = error instanceof Error ? error.message : 'Failed to fetch checkins'
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    )
  }
}

