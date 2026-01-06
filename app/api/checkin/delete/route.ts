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

    console.log('刪除簽到記錄:', { memberId, date })
    
    // 刪除簽到記錄
    const { data, error, count } = await insforge.database
      .from(TABLES.CHECKINS)
      .delete()
      .eq('member_id', memberId)
      .eq('meeting_date', date)
      .select()

    if (error) {
      console.error('Error deleting checkin:', {
        error,
        message: error.message,
        code: (error as any).code,
        memberId,
        date,
      })
      
      return NextResponse.json(
        { error: `刪除簽到記錄失敗：${error.message || '資料庫錯誤'}` },
        { status: 500 }
      )
    }

    const deletedCount = data?.length || 0
    console.log('簽到記錄刪除成功:', { deletedCount, data })
    
    return NextResponse.json({ 
      success: true, 
      deleted: deletedCount > 0,
      count: deletedCount
    })
  } catch (error) {
    console.error('Error deleting checkin:', error)
    return NextResponse.json(
      { error: 'Failed to delete checkin' },
      { status: 500 }
    )
  }
}

