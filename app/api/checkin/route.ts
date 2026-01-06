import { NextResponse } from 'next/server'
import { insforge, TABLES } from '@/lib/insforge'
import { apiError, apiSuccess, safeJsonParse, handleDatabaseError } from '@/lib/api-utils'
import { validateCheckin } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function POST(request: Request) {
  try {
    const { data: body, error: parseError } = await safeJsonParse<{
      memberId?: any
      date?: string
      message?: string
      status?: string
      checkin_time?: string
    }>(request)
    
    if (parseError || !body) {
      return apiError('請求格式錯誤：無法解析 JSON', 400)
    }

    const { memberId, date, message, status, checkin_time } = body

    // 輸入驗證
    if (!memberId || !date) {
      return apiError('會員編號和日期為必填欄位', 400)
    }

    // 使用統一的驗證函數
    const validation = validateCheckin({ memberId, date, message, status, checkin_time })
    if (!validation.valid) {
      return apiError(validation.error || '輸入驗證失敗', 400)
    }

    // 檢查是否有會議
    const { data: existingMeeting, error: meetingFetchError } = await insforge.database
      .from(TABLES.MEETINGS)
      .select('*')
      .eq('date', date)
      .maybeSingle()

    if (meetingFetchError) {
      console.error('Error fetching meeting:', meetingFetchError)
      return apiError(`檢查會議狀態失敗：${handleDatabaseError(meetingFetchError)}`, 500)
    }

    if (!existingMeeting) {
      // 沒有會議時，不允許簽到，回傳清楚的錯誤訊息
      return apiError('今天沒有會議，請先在後台建立會議後再簽到', 400)
    }

    const checkinStatus = status || 'present'

    // 驗證會員是否存在（先檢查會員，避免不必要的查詢）
    const { data: member, error: memberFetchError } = await insforge.database
      .from(TABLES.MEMBERS)
      .select('id')
      .eq('id', memberId)
      .maybeSingle()

    if (memberFetchError) {
      console.error('Error fetching member:', memberFetchError)
      return apiError(`檢查會員失敗：${handleDatabaseError(memberFetchError)}`, 500)
    }

    if (!member) {
      console.error('Member not found:', { memberId })
      return apiError(`會員不存在（編號：${memberId}），請確認會員編號是否正確`, 404)
    }

    // 檢查是否已經簽到
    const { data: existingCheckin, error: checkinFetchError } = await insforge.database
      .from(TABLES.CHECKINS)
      .select('*')
      .eq('member_id', memberId)
      .eq('meeting_date', date)
      .maybeSingle()

    if (checkinFetchError) {
      console.error('Error fetching existing checkin:', checkinFetchError)
      return apiError(`檢查簽到狀態失敗：${handleDatabaseError(checkinFetchError)}`, 500)
    }

    if (existingCheckin) {
      // 更新簽到記錄
      console.log('更新現有簽到記錄:', { memberId, date, status: checkinStatus, checkin_time })
      
      // 如果提供了自定義時間，使用它；否則使用當前時間
      const checkinTime = checkin_time 
        ? new Date(checkin_time).toISOString()
        : new Date().toISOString()
      
      const { error: updateError } = await insforge.database
        .from(TABLES.CHECKINS)
        .update({
          checkin_time: checkinTime,
          message: message?.trim() || null,
          status: checkinStatus,
        })
        .eq('member_id', memberId)
        .eq('meeting_date', date)
      
      if (updateError) {
        console.error('Error updating checkin:', {
          error: updateError,
          message: updateError.message,
          code: (updateError as any).code,
          details: (updateError as any).details,
          memberId,
          date,
        })
        return apiError(`更新簽到記錄失敗：${handleDatabaseError(updateError)}`, 500)
      }
      
      console.log('簽到記錄已更新:', { memberId, date, status: checkinStatus })
    } else {
      // 創建新簽到記錄
      console.log('創建新簽到記錄:', { memberId, date, status: checkinStatus, checkin_time })
      
      // 如果提供了自定義時間，使用它；否則使用當前時間
      const checkinTime = checkin_time 
        ? new Date(checkin_time).toISOString()
        : new Date().toISOString()
      
      const { error: insertError } = await insforge.database
        .from(TABLES.CHECKINS)
        .insert([{
          member_id: memberId,
          meeting_date: date,
          checkin_time: checkinTime,
          message: message?.trim() || null,
          status: checkinStatus,
        }])
      
      if (insertError) {
        console.error('Error creating checkin:', {
          error: insertError,
          message: insertError.message,
          code: (insertError as any).code,
          details: (insertError as any).details,
          memberId,
          date,
        })
        
        // 檢查是否為外鍵約束錯誤
        const errorMessage = String(insertError.message || '')
        const errorCode = String((insertError as any).code || '')
        
        return apiError(`創建簽到記錄失敗：${handleDatabaseError(insertError)}`, 500)
      }
      
      console.log('簽到記錄已創建:', { memberId, date, status: checkinStatus })
    }

    return apiSuccess()
  } catch (error) {
    console.error('Error checking in (catch block):', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return apiError(`簽到失敗：${errorMessage}`, 500)
  }
}

