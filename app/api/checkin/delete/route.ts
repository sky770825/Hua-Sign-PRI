import { NextResponse } from 'next/server'
import { supabaseService, TABLES } from '@/lib/supabase'
import { apiError, apiSuccess, safeJsonParse, handleDatabaseError, requireSameOrigin } from '@/lib/api-utils'
import { validateCheckin } from '@/lib/validation'
import { clearCache } from '@/lib/cache'

const CONTEXT_CACHE_KEY = 'attendance:context'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const originCheck = requireSameOrigin(request)
    if (originCheck) return originCheck

    const { data: body, error: parseError } = await safeJsonParse<{ memberId?: any; date?: string }>(request)
    
    if (parseError || !body) {
      return apiError('請求格式錯誤：無法解析 JSON', 400)
    }

    const { memberId, date } = body

    if (!memberId || !date) {
      return apiError('會員編號和日期為必填欄位', 400)
    }

    // 驗證輸入
    const validation = validateCheckin({ memberId, date })
    if (!validation.valid) {
      return apiError(validation.error || '輸入驗證失敗', 400)
    }

    console.log('刪除簽到記錄:', { memberId, date })
    
    // 刪除簽到記錄
    const { data, error, count } = await supabaseService
      .from(TABLES.CHECKINS)
      .delete({ count: 'exact' })
      .eq('member_id', memberId)
      .eq('meeting_date', date)
      .select()

    if (error) {
      console.error('Error deleting checkin:', {
        error,
        message: error.message,
        code: (error as any).code,
        memberId,
        date,
      })
      
      return apiError(`刪除簽到記錄失敗：${handleDatabaseError(error)}`, 500)
    }

    const deletedCount = data?.length || 0
    console.log('簽到記錄刪除結果:', { deletedCount, memberId, date, data })

    if (deletedCount > 0) {
      clearCache(CONTEXT_CACHE_KEY)
    }

    // 如果沒有刪除任何記錄，可能是記錄不存在
    if (deletedCount === 0) {
      // 檢查記錄是否存在
      const { data: existingCheckin } = await supabaseService
        .from(TABLES.CHECKINS)
        .select('id')
        .eq('member_id', memberId)
        .eq('meeting_date', date)
        .maybeSingle()
      
      if (!existingCheckin) {
        console.warn('簽到記錄不存在:', { memberId, date })
        return NextResponse.json({
          success: true,
          deleted: false,
          count: 0,
          message: '簽到記錄不存在或已被刪除'
        })
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      deleted: deletedCount > 0,
      count: deletedCount,
      ...(deletedCount === 0 && { message: '簽到記錄不存在或已被刪除' })
    })
  } catch (error) {
    console.error('Error deleting checkin:', error)
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return apiError(`刪除簽到記錄失敗：${errorMessage}`, 500)
  }
}
