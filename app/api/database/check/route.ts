import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { apiError, apiSuccess } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  try {
    // 檢查所有需要的表是否存在
    const requiredTables = [
      'estate_attendance_members',
      'estate_attendance_meetings',
      'estate_attendance_checkins',
      'estate_attendance_prizes',
      'estate_attendance_lottery_winners'
    ]

    const tableStatus: Record<string, { exists: boolean; columns?: string[] }> = {}

    for (const tableName of requiredTables) {
      try {
        // 嘗試查詢表結構
        const { data, error } = await supabaseService
          .from(tableName)
          .select('*')
          .limit(0)

        if (error) {
          // 如果錯誤是表不存在，記錄為不存在
          if (error.message.includes('does not exist') || error.code === '42P01') {
            tableStatus[tableName] = { exists: false }
          } else {
            // 其他錯誤，可能是權限問題，但表存在
            tableStatus[tableName] = { exists: true }
          }
        } else {
          // 查詢成功，表存在
          tableStatus[tableName] = { exists: true }
        }
      } catch (err) {
        // 查詢失敗，假設表不存在
        tableStatus[tableName] = { exists: false }
      }
    }

    const missingTables = Object.entries(tableStatus)
      .filter(([_, status]) => !status.exists)
      .map(([name]) => name)

    return apiSuccess({
      tables: tableStatus,
      allExists: missingTables.length === 0,
      missingTables
    })

  } catch (error) {
    console.error('檢查資料庫表失敗:', error)
    return apiError(
      `檢查失敗：${error instanceof Error ? error.message : '未知錯誤'}`,
      500
    )
  }
}
