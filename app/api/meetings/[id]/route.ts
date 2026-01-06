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

    const { error } = await insforge.database
      .from(TABLES.MEETINGS)
      .update({
        date,
        status: status || 'scheduled',
      })
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
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

    if (meeting) {
      // 刪除會議相關的簽到記錄
      await insforge.database
        .from(TABLES.CHECKINS)
        .delete()
        .eq('meeting_date', meeting.date)
    }

    // 刪除會議
    const { error } = await insforge.database
      .from(TABLES.MEETINGS)
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting meeting:', error)
    return NextResponse.json(
      { error: 'Failed to delete meeting' },
      { status: 500 }
    )
  }
}

