import { NextResponse } from 'next/server'
import { insforge, TABLES } from '@/lib/insforge'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { date, status } = await request.json()
    const id = parseInt(params.id)

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      )
    }

    console.log('更新會議:', { id, date, status })
    
    const { data, error } = await insforge.database
      .from(TABLES.MEETINGS)
      .update({
        date,
        status: status || 'scheduled',
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('Error updating meeting:', {
        error,
        message: error.message,
        code: (error as any).code,
        id,
      })
      
      return NextResponse.json(
        { error: `更新會議失敗：${error.message || '資料庫錯誤'}` },
        { status: 500 }
      )
    }

    console.log('會議更新成功:', data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error updating meeting:', error)
    return NextResponse.json(
      { error: 'Failed to update meeting' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    // 獲取會議信息
    const { data: meeting } = await insforge.database
      .from(TABLES.MEETINGS)
      .select('date')
      .eq('id', id)
      .single()

    console.log('刪除會議:', { id })
    
    if (meeting) {
      // 刪除會議相關的簽到記錄
      const { error: deleteCheckinsError } = await insforge.database
        .from(TABLES.CHECKINS)
        .delete()
        .eq('meeting_date', meeting.date)
      
      if (deleteCheckinsError) {
        console.warn('Failed to delete checkins:', deleteCheckinsError)
        // 繼續刪除會議，即使簽到記錄刪除失敗
      } else {
        console.log('相關簽到記錄已刪除')
      }
    }

    // 刪除會議
    const { data, error } = await insforge.database
      .from(TABLES.MEETINGS)
      .delete()
      .eq('id', id)
      .select()

    if (error) {
      console.error('Error deleting meeting:', {
        error,
        message: error.message,
        code: (error as any).code,
        id,
      })
      
      return NextResponse.json(
        { error: `刪除會議失敗：${error.message || '資料庫錯誤'}` },
        { status: 500 }
      )
    }

    console.log('會議刪除成功:', data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error deleting meeting:', error)
    return NextResponse.json(
      { error: 'Failed to delete meeting' },
      { status: 500 }
    )
  }
}

