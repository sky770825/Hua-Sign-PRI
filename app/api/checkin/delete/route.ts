import { NextResponse } from 'next/server'
import { insforge, TABLES } from '@/lib/insforge'

export async function POST(request: Request) {
  try {
    const { memberId, date } = await request.json()

    if (!memberId || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 刪除簽到記錄
    const { error, count } = await insforge.database
      .from(TABLES.CHECKINS)
      .delete({ count: 'exact' })
      .eq('member_id', memberId)
      .eq('meeting_date', date)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, deleted: (count || 0) > 0 })
  } catch (error) {
    console.error('Error deleting checkin:', error)
    return NextResponse.json(
      { error: 'Failed to delete checkin' },
      { status: 500 }
    )
  }
}

