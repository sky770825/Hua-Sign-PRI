import { NextResponse } from 'next/server'
import { supabaseService, TABLES } from '@/lib/supabase'
import { apiError, apiSuccess } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

interface CSVRow {
  memberId: number
  memberName: string
  totalMeetings: number
  presentCount: number
  lateCount: number
  proxyCount: number
  absentCount: number
}

interface AnalyzeRequest {
  statistics: CSVRow[]
  startDate: string
  endDate: string
}

/**
 * 分析 CSV 數據，檢查哪些記錄可能沒有被匯入
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as AnalyzeRequest
    const { statistics, startDate, endDate } = body

    if (!statistics || statistics.length === 0) {
      return apiError('統計數據為空', 400)
    }

    if (!startDate || !endDate) {
      return apiError('開始日期和結束日期為必填', 400)
    }

    console.log(`開始分析 CSV 數據: ${statistics.length} 筆會員數據`)

    // 1. 獲取日期範圍內的所有週四
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    const thursdayDates: string[] = []
    const current = new Date(start)
    
    // 找到第一個週四
    const firstDayOfWeek = current.getDay()
    const daysUntilThursday = (4 - firstDayOfWeek + 7) % 7
    if (daysUntilThursday > 0) {
      current.setDate(current.getDate() + daysUntilThursday)
    } else if (firstDayOfWeek !== 4) {
      current.setDate(current.getDate() + 7)
    }
    
    while (current <= end) {
      thursdayDates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 7)
    }

    console.log(`找到 ${thursdayDates.length} 個週四會議日期`)

    // 2. 獲取所有會員
    const { data: members, error: membersError } = await supabaseService
      .from(TABLES.MEMBERS)
      .select('id, name')
      .order('id', { ascending: true })

    if (membersError) {
      console.error('Error fetching members:', membersError)
      return apiError('獲取會員列表失敗', 500)
    }

    const memberMap = new Map((members || []).map(m => [m.id, m.name]))

    // 3. 獲取現有簽到記錄
    const { data: existingCheckins, error: checkinsError } = await supabaseService
      .from(TABLES.CHECKINS)
      .select('member_id, meeting_date, message')
      .in('meeting_date', thursdayDates)

    if (checkinsError) {
      console.error('獲取現有簽到記錄失敗:', checkinsError)
    }

    const checkinsByMember = new Map<number, Set<string>>()
    if (existingCheckins) {
      for (const checkin of existingCheckins) {
        const memberId = checkin.member_id
        if (!checkinsByMember.has(memberId)) {
          checkinsByMember.set(memberId, new Set())
        }
        checkinsByMember.get(memberId)!.add(checkin.meeting_date)
      }
    }

    // 4. 分析每個會員的數據
    const analysis: Array<{
      memberId: number
      memberName: string
      csvPresentCount: number
      actualCheckins: number
      importedCheckins: number
      missingCheckins: number
      status: 'ok' | 'missing' | 'member_not_found' | 'excess'
      details: {
        expectedDates: number
        actualDates: number
        missingDates: string[]
        excessDates: string[]
      }
    }> = []

    for (const stat of statistics) {
      const memberId = stat.memberId
      const memberName = stat.memberName
      
      // 檢查會員是否存在
      if (!memberMap.has(memberId)) {
        analysis.push({
          memberId,
          memberName,
          csvPresentCount: stat.presentCount,
          actualCheckins: 0,
          importedCheckins: 0,
          missingCheckins: stat.presentCount,
          status: 'member_not_found',
          details: {
            expectedDates: stat.presentCount,
            actualDates: 0,
            missingDates: [],
            excessDates: []
          }
        })
        continue
      }

      // 獲取該會員的實際簽到記錄
      const memberCheckins = checkinsByMember.get(memberId) || new Set()
      const importedCheckins = (existingCheckins || [])
        .filter(c => c.member_id === memberId && 
                     c.message && 
                     c.message.includes('從統計數據匯入'))
        .length

      const actualCheckins = memberCheckins.size
      const csvPresentCount = stat.presentCount
      const missingCheckins = Math.max(0, csvPresentCount - actualCheckins)

      // 找出缺少的日期（如果 CSV 說有出席但實際沒有記錄）
      const missingDates: string[] = []
      if (csvPresentCount > actualCheckins) {
        // 找出應該有但沒有的日期
        const availableDates = thursdayDates.filter(date => 
          !memberCheckins.has(date)
        )
        missingDates.push(...availableDates.slice(0, missingCheckins))
      }

      // 找出多餘的日期（如果實際記錄比 CSV 多）
      const excessDates: string[] = []
      if (actualCheckins > csvPresentCount) {
        const memberDates = Array.from(memberCheckins)
        excessDates.push(...memberDates.slice(csvPresentCount))
      }

      let status: 'ok' | 'missing' | 'excess' = 'ok'
      if (missingCheckins > 0) {
        status = 'missing'
      } else if (excessDates.length > 0) {
        status = 'excess'
      }

      analysis.push({
        memberId,
        memberName,
        csvPresentCount,
        actualCheckins,
        importedCheckins,
        missingCheckins,
        status,
        details: {
          expectedDates: csvPresentCount,
          actualDates: actualCheckins,
          missingDates,
          excessDates
        }
      })
    }

    // 5. 統計摘要
    const summary = {
      totalMembers: statistics.length,
      membersNotFound: analysis.filter(a => a.status === 'member_not_found').length,
      membersOk: analysis.filter(a => a.status === 'ok').length,
      membersMissing: analysis.filter(a => a.status === 'missing').length,
      membersExcess: analysis.filter(a => a.status === 'excess').length,
      totalCsvCheckins: statistics.reduce((sum, s) => sum + s.presentCount, 0),
      totalActualCheckins: analysis.reduce((sum, a) => sum + a.actualCheckins, 0),
      totalImportedCheckins: analysis.reduce((sum, a) => sum + a.importedCheckins, 0),
      totalMissingCheckins: analysis.reduce((sum, a) => sum + a.missingCheckins, 0),
      totalMeetings: thursdayDates.length
    }

    return apiSuccess({
      summary,
      analysis: analysis.filter(a => a.status !== 'ok'), // 只返回有問題的記錄
      allAnalysis: analysis, // 所有記錄
      thursdayDates
    })

  } catch (error) {
    console.error('分析 CSV 數據失敗:', error)
    return apiError(
      `分析失敗：${error instanceof Error ? error.message : '未知錯誤'}`,
      500
    )
  }
}
