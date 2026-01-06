import { NextResponse } from 'next/server'
import { insforge, TABLES } from '@/lib/insforge'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // 獲取會議信息
    const { data: meetings, error: meetingError } = await insforge.database
      .from(TABLES.MEETINGS)
      .select('*')
      .eq('date', date)
      .maybeSingle()

    if (meetingError) {
      console.error('Error fetching meeting:', meetingError)
    }

    // 獲取簽到記錄（包含會員信息）
    const { data: checkins, error: checkinsError } = await insforge.database
      .from(TABLES.CHECKINS)
      .select(`
        member_id,
        checkin_time,
        message,
        status,
        checkin_members!inner(id, name, profession)
      `)
      .eq('meeting_date', date)
      .order('checkin_time', { ascending: false })

    if (checkinsError) {
      console.error('Error fetching checkins:', checkinsError)
      return NextResponse.json(
        { error: 'Failed to fetch checkins' },
        { status: 500 }
      )
    }

    // 格式化返回數據
    const formattedCheckins = (checkins || []).map((c: any) => ({
      member_id: c.member_id,
      checkin_time: c.checkin_time,
      message: c.message,
      status: c.status,
    }))

    return NextResponse.json({
      meeting: meetings || null,
      checkins: formattedCheckins,
    })
  } catch (error) {
    console.error('Error fetching checkins:', error)
    return NextResponse.json(
      { error: 'Failed to fetch checkins' },
      { status: 500 }
    )
  }
}

