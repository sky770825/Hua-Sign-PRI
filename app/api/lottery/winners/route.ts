import { NextResponse } from 'next/server'
import { insforge, TABLES } from '@/lib/insforge'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0]

    const { data: winners, error } = await insforge.database
      .from(TABLES.LOTTERY_WINNERS)
      .select(`
        id,
        meeting_date,
        created_at,
        checkin_members!inner(id, name),
        checkin_prizes!inner(id, name, image_url)
      `)
      .eq('meeting_date', targetDate)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })

    if (error) {
      throw error
    }

    // 格式化返回數據
    const formattedWinners = (winners || []).map((w: any) => ({
      id: w.id,
      meeting_date: w.meeting_date,
      created_at: w.created_at,
      member_id: w.checkin_members?.id,
      member_name: w.checkin_members?.name,
      prize_id: w.checkin_prizes?.id,
      prize_name: w.checkin_prizes?.name,
      prize_image_url: w.checkin_prizes?.image_url,
    }))

    return NextResponse.json({ winners: formattedWinners })
  } catch (error) {
    console.error('Error fetching lottery winners:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lottery winners' },
      { status: 500 }
    )
  }
}
