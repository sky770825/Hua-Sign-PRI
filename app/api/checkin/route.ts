import { NextResponse } from 'next/server'
import { insforge, TABLES } from '@/lib/insforge'

export async function POST(request: Request) {
  try {
    const { memberId, date, message, status } = await request.json()

    // 輸入驗證
    if (!memberId || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 驗證 memberId 是數字
    if (typeof memberId !== 'number' || memberId <= 0) {
      return NextResponse.json(
        { error: 'Invalid member ID' },
        { status: 400 }
      )
    }

    // 驗證日期格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    // 驗證消息長度（防止過長輸入）
    if (message && message.length > 500) {
      return NextResponse.json(
        { error: 'Message too long (max 500 characters)' },
        { status: 400 }
      )
    }

    // 檢查是否有會議
    const { data: existingMeeting } = await insforge.database
      .from(TABLES.MEETINGS)
      .select('*')
      .eq('date', date)
      .maybeSingle()

    if (!existingMeeting) {
      // 創建新會議
      await insforge.database
        .from(TABLES.MEETINGS)
        .insert([{ date, status: 'scheduled' }])
    }

    const checkinStatus = status || 'present'

    // 檢查是否已經簽到
    const { data: existingCheckin } = await insforge.database
      .from(TABLES.CHECKINS)
      .select('*')
      .eq('member_id', memberId)
      .eq('meeting_date', date)
      .maybeSingle()

    // 驗證會員是否存在
    const { data: member } = await insforge.database
      .from(TABLES.MEMBERS)
      .select('id')
      .eq('id', memberId)
      .maybeSingle()

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    if (existingCheckin) {
      // 更新簽到記錄
      const { error: updateError } = await insforge.database
        .from(TABLES.CHECKINS)
        .update({
          checkin_time: new Date().toISOString(),
          message: message?.trim() || null,
          status: checkinStatus,
        })
        .eq('member_id', memberId)
        .eq('meeting_date', date)
      
      if (updateError) {
        console.error('Error updating checkin:', updateError)
        throw updateError
      }
      
      console.log('簽到記錄已更新:', { memberId, date })
    } else {
      // 創建新簽到記錄
      const { error: insertError } = await insforge.database
        .from(TABLES.CHECKINS)
        .insert([{
          member_id: memberId,
          meeting_date: date,
          message: message?.trim() || null,
          status: checkinStatus,
        }])
      
      if (insertError) {
        console.error('Error creating checkin:', insertError)
        throw insertError
      }
      
      console.log('簽到記錄已創建:', { memberId, date })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error checking in:', error)
    return NextResponse.json(
      { error: 'Failed to check in' },
      { status: 500 }
    )
  }
}

