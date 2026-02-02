import { NextResponse } from 'next/server'
import { supabase, supabaseService, TABLES } from '@/lib/supabase'
import { apiError, apiSuccess, safeJsonParse, handleDatabaseError } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

interface StatisticsRow {
  memberId: number
  memberName: string
  totalMeetings: number
  presentCount: number
  lateCount: number
  proxyCount: number
  absentCount: number
}

interface ImportRequest {
  statistics: StatisticsRow[]
  startDate: string // 開始日期 (2025-07-18)
  endDate: string   // 結束日期
}

export async function POST(request: Request) {
  try {
    // 首先檢查資料庫表是否存在
    const requiredTables = [
      TABLES.MEMBERS,
      TABLES.MEETINGS,
      TABLES.CHECKINS
    ]
    
    const tableCheckResults: Record<string, boolean> = {}
    for (const tableName of requiredTables) {
      try {
        const { error } = await supabaseService
          .from(tableName)
          .select('*')
          .limit(0)
        
        if (error) {
          if (error.message.includes('does not exist') || error.code === '42P01') {
            tableCheckResults[tableName] = false
          } else {
            tableCheckResults[tableName] = true // 表存在，但可能有其他錯誤
          }
        } else {
          tableCheckResults[tableName] = true
        }
      } catch (err) {
        tableCheckResults[tableName] = false
      }
    }
    
    const missingTables = Object.entries(tableCheckResults)
      .filter(([_, exists]) => !exists)
      .map(([name]) => name)
    
    if (missingTables.length > 0) {
      return apiError(
        `資料庫表尚未建立：${missingTables.join(', ')}\n\n請先執行「檢查資料庫」功能建立資料表。`,
        400,
        { missingTables, tableCheckResults }
      )
    }

    const { data: body, error: parseError } = await safeJsonParse<ImportRequest>(request)
    
    if (parseError || !body) {
      return apiError('請求格式錯誤：無法解析 JSON', 400)
    }

    const { statistics, startDate, endDate } = body

    if (!statistics || statistics.length === 0) {
      return apiError('統計數據為空', 400)
    }

    if (!startDate || !endDate) {
      return apiError('開始日期和結束日期為必填', 400)
    }

    console.log(`開始匯入統計數據: ${statistics.length} 筆會員數據，日期範圍: ${startDate} ~ ${endDate}`)

    // 1. 獲取日期範圍內的所有會議（週四）
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // 找到所有週四
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
      current.setDate(current.getDate() + 7) // 加7天到下個週四
    }

    console.log(`找到 ${thursdayDates.length} 個週四會議日期`)

    // 2. 確保所有會議都存在
    const meetingResults = await Promise.allSettled(
      thursdayDates.map(date => 
        supabaseService
          .from(TABLES.MEETINGS)
          .upsert({ date, status: 'scheduled' }, { onConflict: 'date' })
      )
    )

    const meetingErrors = meetingResults.filter(r => r.status === 'rejected')
    if (meetingErrors.length > 0) {
      console.warn('部分會議創建失敗:', meetingErrors)
    }

    // 3. 獲取現有簽到記錄（用於檢查，需要包含狀態）
    const { data: existingCheckins, error: checkinsError } = await supabaseService
      .from(TABLES.CHECKINS)
      .select('member_id, meeting_date, status')
      .in('meeting_date', thursdayDates)

    if (checkinsError) {
      console.error('獲取現有簽到記錄失敗:', checkinsError)
    }

    // 保留原有的檢查邏輯（用於快速檢查）
    const existingCheckinsMap = new Map<string, boolean>()
    if (existingCheckins) {
      existingCheckins.forEach((c: any) => {
        existingCheckinsMap.set(`${c.member_id}-${c.meeting_date}`, true)
      })
    }

    // 4. 根據統計數據重建簽到記錄
    // 策略：根據出席次數，隨機分配出席日期
    let totalCreated = 0
    let totalSkipped = 0
    const errors: string[] = []

    for (const stat of statistics) {
      try {
        // 驗證會員是否存在
        const { data: member, error: memberError } = await supabaseService
          .from(TABLES.MEMBERS)
          .select('id')
          .eq('id', stat.memberId)
          .maybeSingle()

        if (memberError) {
          errors.push(`會員 ${stat.memberId} (${stat.memberName}): 查詢失敗`)
          continue
        }

        if (!member) {
          errors.push(`會員 ${stat.memberId} (${stat.memberName}): 不存在`)
          continue
        }

        // 計算需要創建的簽到記錄
        // 策略：按時間順序分配，優先分配較早的日期（模擬實際出席情況）
        // 只過濾掉已存在且為「出席」狀態的記錄（present, early, late, early_leave）
        // 如果記錄是「缺席」狀態，可以覆蓋為出席
        const memberExistingCheckins = (existingCheckins || []).filter((c: any) => 
          c.member_id === stat.memberId
        )
        const memberPresentDates = new Set(
          memberExistingCheckins
            .filter((c: any) => {
              const status = c.status || 'absent'
              return status === 'present' || status === 'early' || status === 'late' || status === 'early_leave'
            })
            .map((c: any) => c.meeting_date)
        )
        
        // 可用日期 = 所有週四日期 - 已出席的日期
        const availableDates = thursdayDates.filter(date => 
          !memberPresentDates.has(date)
        )
        
        // 檢查是否有足夠的可用日期
        if (availableDates.length === 0) {
          errors.push(`會員 ${stat.memberId} (${stat.memberName}): 所有日期都已有簽到記錄，無法新增`)
          totalSkipped += stat.presentCount
          continue
        }
        
        if (availableDates.length < stat.presentCount) {
          errors.push(`會員 ${stat.memberId} (${stat.memberName}): 可用日期不足（需要 ${stat.presentCount} 個，只有 ${availableDates.length} 個可用日期）`)
        }
        
        // 按時間順序選擇前 N 個日期（N = 出席次數，但不超過可用日期數）
        const datesToCreate = availableDates.slice(0, Math.min(stat.presentCount, availableDates.length))

        // 創建簽到記錄
        // 對於已存在但為缺席狀態的記錄，我們需要先刪除再創建
        const datesToDelete: string[] = []
        for (const date of datesToCreate) {
          const existingCheckin = memberExistingCheckins.find((c: any) => c.meeting_date === date)
          if (existingCheckin) {
            const status = existingCheckin.status || 'absent'
            // 如果是缺席狀態，需要刪除後重新創建
            if (status === 'absent') {
              datesToDelete.push(date)
            }
          }
        }
        
        // 刪除需要覆蓋的缺席記錄
        if (datesToDelete.length > 0) {
          console.log(`會員 ${stat.memberId} (${stat.memberName}): 準備刪除 ${datesToDelete.length} 筆缺席記錄以便重新創建`)
          for (const date of datesToDelete) {
            const { error: deleteError } = await supabaseService
              .from(TABLES.CHECKINS)
              .delete()
              .eq('member_id', stat.memberId)
              .eq('meeting_date', date)
              .eq('status', 'absent')
            
            if (deleteError) {
              console.warn(`刪除缺席記錄失敗 (會員 ${stat.memberId}, 日期 ${date}):`, deleteError)
            } else {
              // 從檢查映射中移除，允許重新創建
              existingCheckinsMap.delete(`${stat.memberId}-${date}`)
            }
          }
        }
        
        const checkinsToInsert = datesToCreate
          .filter(date => {
            // 過濾掉已存在且為出席狀態的記錄
            const existingCheckin = memberExistingCheckins.find((c: any) => c.meeting_date === date)
            if (existingCheckin) {
              const status = existingCheckin.status || 'absent'
              // 如果是出席狀態，跳過
              if (status === 'present' || status === 'early' || status === 'late' || status === 'early_leave') {
                return false
              }
            }
            return true
          })
          .map(date => {
            // 根據遲到次數和代理次數決定狀態
            // 這裡簡化處理：優先標記遲到和代理
            let status: 'present' | 'late' = 'present'
            let message = '從統計數據匯入'
            
            // 如果遲到次數 > 0，優先標記為遲到
            if (stat.lateCount > 0) {
              // 簡單策略：將前 lateCount 個標記為遲到
              const dateIndex = datesToCreate.indexOf(date)
              if (dateIndex < stat.lateCount) {
                status = 'late'
                message = '從統計數據匯入（遲到）'
              }
            }
            
            // 如果代理次數 > 0，在留言中標記
            if (stat.proxyCount > 0) {
              const dateIndex = datesToCreate.indexOf(date)
              if (dateIndex < stat.proxyCount) {
                message = message.includes('遲到') 
                  ? '從統計數據匯入（遲到、代理）'
                  : '從統計數據匯入（代理）'
              }
            }
            
            return {
              member_id: stat.memberId,
              meeting_date: date,
              checkin_time: new Date(date + 'T19:00:00').toISOString(),
              message,
              status
            }
          })

        if (checkinsToInsert.length > 0) {
          // 分批插入，避免一次插入太多數據
          const batchSize = 50
          for (let i = 0; i < checkinsToInsert.length; i += batchSize) {
            const batch = checkinsToInsert.slice(i, i + batchSize)
            const { error: insertError } = await supabaseService
              .from(TABLES.CHECKINS)
              .insert(batch)

            if (insertError) {
              console.error(`批次插入失敗 (會員 ${stat.memberId}):`, insertError)
              errors.push(`會員 ${stat.memberId} (${stat.memberName}): 批次 ${Math.floor(i/batchSize) + 1} 插入失敗 - ${handleDatabaseError(insertError)}`)
            } else {
              totalCreated += batch.length
              batch.forEach(c => {
                existingCheckinsMap.set(`${c.member_id}-${c.meeting_date}`, true)
              })
            }
          }
        } else {
          // 如果沒有創建任何記錄，可能是因為所有日期都已存在
          if (datesToCreate.length === 0) {
            totalSkipped += stat.presentCount
          } else {
            // 部分跳過（因為已存在）
            totalSkipped += (stat.presentCount - checkinsToInsert.length)
          }
        }

      } catch (error) {
        errors.push(`會員 ${stat.memberId} (${stat.memberName}): 處理錯誤 - ${error instanceof Error ? error.message : '未知錯誤'}`)
      }
    }

    return apiSuccess({
      message: '統計數據匯入完成',
      results: {
        totalMembers: statistics.length,
        totalMeetings: thursdayDates.length,
        checkinsCreated: totalCreated,
        checkinsSkipped: totalSkipped,
        errors: errors.length,
        errorDetails: errors.slice(0, 20) // 只返回前20個錯誤
      }
    })

  } catch (error) {
    console.error('匯入統計數據失敗:', error)
    return apiError(
      `匯入失敗：${error instanceof Error ? error.message : '未知錯誤'}`,
      500
    )
  }
}
