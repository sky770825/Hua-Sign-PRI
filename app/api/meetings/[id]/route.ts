import { NextResponse } from 'next/server'
import { insforge, TABLES } from '@/lib/insforge'
import { apiError, apiSuccess, safeJsonParse, handleDatabaseError } from '@/lib/api-utils'
import { validateMeeting } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data: body, error: parseError } = await safeJsonParse<{ date?: string; status?: string }>(request)
    
    if (parseError || !body) {
      return apiError('請求格式錯誤：無法解析 JSON', 400)
    }

    const { date, status } = body
    const id = parseInt(params.id)

    if (isNaN(id) || id <= 0) {
      return apiError('會議 ID 無效', 400)
    }

    if (!date) {
      return apiError('日期為必填欄位', 400)
    }

    // 驗證輸入
    const validation = validateMeeting({ date, status })
    if (!validation.valid) {
      return apiError(validation.error || '輸入驗證失敗', 400)
    }

    console.log('更新會議:', { id, date, status })
    
    const { data, error } = await insforge.database
      .from(TABLES.MEETINGS)
      .update({
        date,
        status: status || 'scheduled',
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('Error updating meeting:', {
        error,
        message: error.message,
        code: (error as any).code,
        id,
      })
      
      return apiError(`更新會議失敗：${handleDatabaseError(error)}`, 500)
    }

    console.log('會議更新成功:', data)
    return apiSuccess(data)
  } catch (error) {
    console.error('Error updating meeting:', error)
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return apiError(`更新會議失敗：${errorMessage}`, 500)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    if (isNaN(id) || id <= 0) {
      return apiError('會議 ID 無效', 400)
    }

    // 獲取會議信息（使用 maybeSingle 避免找不到時拋出錯誤）
    const { data: meeting } = await insforge.database
      .from(TABLES.MEETINGS)
      .select('date')
      .eq('id', id)
      .maybeSingle()

    console.log('刪除會議:', { id })
    
    if (meeting) {
      // 刪除會議相關的簽到記錄
      const { error: deleteCheckinsError } = await insforge.database
        .from(TABLES.CHECKINS)
        .delete()
        .eq('meeting_date', meeting.date)
      
      if (deleteCheckinsError) {
        console.warn('Failed to delete checkins:', deleteCheckinsError)
        // 繼續刪除會議，即使簽到記錄刪除失敗
      } else {
        console.log('相關簽到記錄已刪除')
      }
    }

    // 刪除會議
    const { data, error } = await insforge.database
      .from(TABLES.MEETINGS)
      .delete()
      .eq('id', id)
      .select()

    if (error) {
      console.error('Error deleting meeting:', {
        error,
        message: error.message,
        code: (error as any).code,
        id,
      })
      
      return apiError(`刪除會議失敗：${handleDatabaseError(error)}`, 500)
    }

    console.log('會議刪除成功:', data)
    return apiSuccess(data)
  } catch (error) {
    console.error('Error deleting meeting:', error)
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return apiError(`刪除會議失敗：${errorMessage}`, 500)
  }
}

