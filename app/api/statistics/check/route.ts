import { NextResponse } from 'next/server'
import { supabaseService, TABLES } from '@/lib/supabase'
import { apiError, apiSuccess } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

/**
 * 檢查匯入資料的情況
 * 返回：
 * - 總會議數
 * - 總簽到記錄數
 * - 每個會員的簽到統計
 * - 最近匯入的記錄
 */
export async function GET() {
  try {
    // 1. 獲取所有會議
    const { data: meetings, error: meetingsError } = await supabaseService
      .from(TABLES.MEETINGS)
      .select('id, date, status, created_at')
      .order('date', { ascending: false })
      .limit(50) // 最近50個會議

    if (meetingsError) {
      console.error('Error fetching meetings:', meetingsError)
      return apiError('獲取會議列表失敗', 500)
    }

    // 2. 獲取所有會員
    const { data: members, error: membersError } = await supabaseService
      .from(TABLES.MEMBERS)
      .select('id, name')
      .order('id', { ascending: true })

    if (membersError) {
      console.error('Error fetching members:', membersError)
      return apiError('獲取會員列表失敗', 500)
    }

    // 3. 獲取所有簽到記錄（包含匯入標記）
    const { data: checkins, error: checkinsError } = await supabaseService
      .from(TABLES.CHECKINS)
      .select('id, member_id, meeting_date, status, message, created_at')
      .order('created_at', { ascending: false })
      .limit(1000) // 最近1000筆記錄

    if (checkinsError) {
      console.error('Error fetching checkins:', checkinsError)
      return apiError('獲取簽到記錄失敗', 500)
    }

    // 4. 統計匯入的記錄（從留言中判斷）
    const importedCheckins = (checkins || []).filter(c => 
      c.message && c.message.includes('從統計數據匯入')
    )

    // 5. 按會員統計簽到記錄
    const memberStats: Record<number, {
      memberId: number
      memberName: string
      totalCheckins: number
      importedCheckins: number
      recentCheckins: Array<{ date: string; status: string; isImported: boolean }>
    }> = {}

    for (const member of members || []) {
      const memberCheckins = (checkins || []).filter(c => c.member_id === member.id)
      const imported = memberCheckins.filter(c => 
        c.message && c.message.includes('從統計數據匯入')
      )

      memberStats[member.id] = {
        memberId: member.id,
        memberName: member.name,
        totalCheckins: memberCheckins.length,
        importedCheckins: imported.length,
        recentCheckins: memberCheckins.slice(0, 10).map(c => ({
          date: c.meeting_date,
          status: c.status || 'present',
          isImported: !!(c.message && c.message.includes('從統計數據匯入'))
        }))
      }
    }

    // 6. 統計最近匯入的記錄（按日期分組）
    const recentImports = importedCheckins.slice(0, 50).map(c => ({
      memberId: c.member_id,
      meetingDate: c.meeting_date,
      createdAt: c.created_at,
      status: c.status || 'present'
    }))

    // 7. 按日期統計匯入記錄
    const importByDate: Record<string, number> = {}
    for (const checkin of importedCheckins) {
      const date = checkin.created_at ? checkin.created_at.split('T')[0] : 'unknown'
      importByDate[date] = (importByDate[date] || 0) + 1
    }

    return apiSuccess({
      summary: {
        totalMeetings: meetings?.length || 0,
        totalMembers: members?.length || 0,
        totalCheckins: checkins?.length || 0,
        importedCheckins: importedCheckins.length,
        importPercentage: checkins && checkins.length > 0 
          ? ((importedCheckins.length / checkins.length) * 100).toFixed(1)
          : '0.0'
      },
      recentMeetings: (meetings || []).slice(0, 10).map(m => ({
        id: m.id,
        date: m.date,
        status: m.status,
        createdAt: m.created_at
      })),
      memberStats: Object.values(memberStats).slice(0, 20), // 前20個會員
      recentImports: recentImports.slice(0, 20),
      importByDate: Object.entries(importByDate)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 10)
        .map(([date, count]) => ({ date, count }))
    })

  } catch (error) {
    console.error('Error checking import status:', error)
    return apiError(
      `檢查失敗：${error instanceof Error ? error.message : '未知錯誤'}`,
      500
    )
  }
}
