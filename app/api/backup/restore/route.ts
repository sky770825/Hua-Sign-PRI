import { NextResponse } from 'next/server'
import { supabase, supabaseService, TABLES } from '@/lib/supabase'
import { apiError, apiSuccess, handleDatabaseError, requireDangerousAdminOpsEnabled, requireSameOrigin } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

interface BackupData {
  members?: Array<{ id: number; name: string; profession: string | null }>
  meetings?: Array<{ id: number; date: string; status: string }>
  prizes?: Array<any>
  checkins?: Array<{ date: string; checkins: any[] }>
  winners?: Array<any>
  timestamp?: string
}

export async function POST(request: Request) {
  try {
    const originCheck = requireSameOrigin(request)
    if (originCheck) return originCheck
    const dangerousOpCheck = requireDangerousAdminOpsEnabled()
    if (dangerousOpCheck) return dangerousOpCheck

    const body = await request.json()
    const backupData: BackupData = body.data

    if (!backupData) {
      return apiError('備份資料格式錯誤', 400)
    }

    console.log('開始還原資料:', {
      members: backupData.members?.length || 0,
      meetings: backupData.meetings?.length || 0,
      prizes: backupData.prizes?.length || 0,
      checkins: backupData.checkins?.length || 0,
      winners: backupData.winners?.length || 0,
    })

    const results = {
      members: { success: 0, failed: 0 },
      meetings: { success: 0, failed: 0 },
      prizes: { success: 0, failed: 0 },
      checkins: { success: 0, failed: 0 },
      winners: { success: 0, failed: 0 },
    }

    // 還原會員資料
    if (backupData.members && backupData.members.length > 0) {
      try {
        // 使用 upsert 避免重複 ID 錯誤
        const { error: membersError } = await supabaseService
          .from(TABLES.MEMBERS)
          .upsert(backupData.members, { onConflict: 'id' })

        if (membersError) {
          console.error('還原會員失敗:', membersError)
          results.members.failed = backupData.members.length
        } else {
          results.members.success = backupData.members.length
        }
      } catch (error) {
        console.error('還原會員異常:', error)
        results.members.failed = backupData.members.length
      }
    }

    // 還原會議資料
    if (backupData.meetings && backupData.meetings.length > 0) {
      try {
        const { error: meetingsError } = await supabaseService
          .from(TABLES.MEETINGS)
          .upsert(backupData.meetings, { onConflict: 'id' })

        if (meetingsError) {
          console.error('還原會議失敗:', meetingsError)
          results.meetings.failed = backupData.meetings.length
        } else {
          results.meetings.success = backupData.meetings.length
        }
      } catch (error) {
        console.error('還原會議異常:', error)
        results.meetings.failed = backupData.meetings.length
      }
    }

    // 還原獎品資料
    if (backupData.prizes && backupData.prizes.length > 0) {
      try {
        const { error: prizesError } = await supabaseService
          .from(TABLES.PRIZES)
          .upsert(backupData.prizes, { onConflict: 'id' })

        if (prizesError) {
          console.error('還原獎品失敗:', prizesError)
          results.prizes.failed = backupData.prizes.length
        } else {
          results.prizes.success = backupData.prizes.length
        }
      } catch (error) {
        console.error('還原獎品異常:', error)
        results.prizes.failed = backupData.prizes.length
      }
    }

    // 還原簽到記錄（需要先清除現有記錄）
    if (backupData.checkins && backupData.checkins.length > 0) {
      try {
        // 先刪除所有現有簽到記錄
        const { error: deleteError } = await supabaseService
          .from(TABLES.CHECKINS)
          .delete()
          .neq('id', 0) // 刪除所有記錄

        if (deleteError) {
          console.warn('清除現有簽到記錄時出錯:', deleteError)
        }

        // 還原簽到記錄
        const allCheckins: any[] = []
        for (const dateGroup of backupData.checkins) {
          if (dateGroup.checkins && Array.isArray(dateGroup.checkins)) {
            // 確保每個簽到記錄都有必要的欄位
            dateGroup.checkins.forEach((checkin: any) => {
              if (checkin.member_id && dateGroup.date) {
                allCheckins.push({
                  member_id: checkin.member_id,
                  meeting_date: dateGroup.date,
                  checkin_time: checkin.checkin_time || new Date().toISOString(),
                  message: checkin.message || null,
                  status: checkin.status || 'present',
                })
              }
            })
          }
        }

        if (allCheckins.length > 0) {
          // 分批插入，避免單次插入過多資料
          const batchSize = 50
          for (let i = 0; i < allCheckins.length; i += batchSize) {
            const batch = allCheckins.slice(i, i + batchSize)
            const { error: checkinsError } = await supabaseService
              .from(TABLES.CHECKINS)
              .insert(batch)

            if (checkinsError) {
              console.error('還原簽到記錄失敗:', checkinsError)
              results.checkins.failed += batch.length
            } else {
              results.checkins.success += batch.length
            }
          }
        }
      } catch (error) {
        console.error('還原簽到記錄異常:', error)
        results.checkins.failed = backupData.checkins.reduce((sum, g) => sum + (g.checkins?.length || 0), 0)
      }
    }

    // 還原中獎記錄（需要先清除現有記錄）
    if (backupData.winners && backupData.winners.length > 0) {
      try {
        // 先刪除所有現有中獎記錄
        const { error: deleteError } = await supabaseService
          .from(TABLES.LOTTERY_WINNERS)
          .delete()
          .neq('id', 0) // 刪除所有記錄

        if (deleteError) {
          console.warn('清除現有中獎記錄時出錯:', deleteError)
        }

        // 還原中獎記錄
        const { error: winnersError } = await supabaseService
          .from(TABLES.LOTTERY_WINNERS)
          .insert(backupData.winners)

        if (winnersError) {
          console.error('還原中獎記錄失敗:', winnersError)
          results.winners.failed = backupData.winners.length
        } else {
          results.winners.success = backupData.winners.length
        }
      } catch (error) {
        console.error('還原中獎記錄異常:', error)
        results.winners.failed = backupData.winners.length
      }
    }

    console.log('還原完成:', results)

    return apiSuccess({
      message: '資料還原完成',
      results,
    })
  } catch (error) {
    console.error('Error restoring data:', error)
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return apiError(`還原失敗：${errorMessage}`, 500)
  }
}
