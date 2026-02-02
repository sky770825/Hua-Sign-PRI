import { NextResponse } from 'next/server'
import { supabase, supabaseService, TABLES } from '@/lib/supabase'

// 標記為動態路由（因為使用了 request.url）
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0]

    console.log('📋 查詢中獎記錄:', { targetDate, table: TABLES.LOTTERY_WINNERS })

    // 使用 supabaseService（service_role key）以繞過 RLS
    const { data: winners, error } = await supabaseService
      .from(TABLES.LOTTERY_WINNERS)
      .select(`
        id,
        meeting_date,
        created_at,
        claimed_status,
        member_id,
        prize_id,
        estate_attendance_members!inner(id, name),
        estate_attendance_prizes!inner(id, name, image_url)
      `)
      .eq('meeting_date', targetDate)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })

    if (error) {
      console.error('❌ 查詢中獎記錄失敗:', error)
      throw error
    }

    console.log('📋 查詢結果:', {
      targetDate,
      count: winners?.length || 0,
      rawWinners: winners?.map((w: any) => ({
        id: w.id,
        member_id: w.member_id,
        prize_id: w.prize_id,
        member_data: w.estate_attendance_members,
        prize_data: w.estate_attendance_prizes,
      }))
    })

    // 格式化返回數據
    const formattedWinners = (winners || []).map((w: any) => {
      // 處理 estate_attendance_members 和 estate_attendance_prizes 可能是數組或對象的情況
      const member = Array.isArray(w.estate_attendance_members) 
        ? w.estate_attendance_members[0] 
        : w.estate_attendance_members
      const prize = Array.isArray(w.estate_attendance_prizes) 
        ? w.estate_attendance_prizes[0] 
        : w.estate_attendance_prizes
      
      const formatted = {
        id: w.id,
        meeting_date: w.meeting_date,
        created_at: w.created_at,
        claimed_status: w.claimed_status || 'pending',
        member_id: w.member_id || member?.id,
        member_name: member?.name || '未知會員',
        prize_id: w.prize_id || prize?.id,
        prize_name: prize?.name || '未知獎品',
        prize_image_url: prize?.image_url || '',
      }

      // 驗證數據完整性
      if (!formatted.member_name || formatted.member_name === '未知會員') {
        console.warn('⚠️ 中獎記錄缺少會員名稱:', {
          id: w.id,
          member_id: w.member_id,
          member_data: member,
        })
      }
      if (!formatted.prize_name || formatted.prize_name === '未知獎品') {
        console.warn('⚠️ 中獎記錄缺少獎品名稱:', {
          id: w.id,
          prize_id: w.prize_id,
          prize_data: prize,
        })
      }

      return formatted
    })

    console.log('📋 格式化後的中獎記錄:', {
      targetDate,
      count: formattedWinners.length,
      winners: formattedWinners.map((w: any) => ({
        id: w.id,
        member_id: w.member_id,
        member_name: w.member_name,
        prize_name: w.prize_name,
      }))
    })

    return NextResponse.json({ winners: formattedWinners })
  } catch (error) {
    console.error('Error fetching lottery winners:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lottery winners' },
      { status: 500 }
    )
  }
}
