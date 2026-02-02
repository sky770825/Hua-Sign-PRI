import { NextResponse } from 'next/server'
import { supabaseService, TABLES } from '@/lib/supabase'
import { ensureSupabaseConfigured } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * 獲取歷史獲獎紀錄（所有中獎記錄，依時間倒序）
 * 用於獎品管理頁面的「歷史獲獎紀錄」區塊
 */
export async function GET(request: Request) {
  const envErr = ensureSupabaseConfigured()
  if (envErr) return envErr
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50') || 50, 200)

    const { data: winners, error } = await supabaseService
      .from(TABLES.LOTTERY_WINNERS)
      .select(`
        id,
        meeting_date,
        created_at,
        member_id,
        prize_id,
        estate_attendance_members!inner(id, name),
        estate_attendance_prizes!inner(id, name, image_url)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('查詢歷史獲獎紀錄失敗:', error)
      return NextResponse.json({ error: '獲取歷史紀錄失敗' }, { status: 500 })
    }

    const formatted = (winners || []).map((w: any) => {
      const member = Array.isArray(w.estate_attendance_members)
        ? w.estate_attendance_members[0]
        : w.estate_attendance_members
      const prize = Array.isArray(w.estate_attendance_prizes)
        ? w.estate_attendance_prizes[0]
        : w.estate_attendance_prizes
      return {
        id: w.id,
        meeting_date: w.meeting_date,
        created_at: w.created_at,
        member_id: w.member_id,
        member_name: member?.name || '未知',
        prize_id: w.prize_id,
        prize_name: prize?.name || '未知',
        prize_image_url: prize?.image_url || '',
      }
    })

    return NextResponse.json({ winners: formatted })
  } catch (error) {
    console.error('Error fetching lottery history:', error)
    return NextResponse.json({ error: '獲取歷史紀錄失敗' }, { status: 500 })
  }
}
