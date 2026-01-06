import { NextResponse } from 'next/server'
import { insforge, TABLES } from '@/lib/insforge'
import { apiError, apiSuccess, safeJsonParse, handleDatabaseError } from '@/lib/api-utils'
import { validateMember } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// 背景同步到 Google Sheets 的輔助函數
async function syncToGoogleSheets() {
  try {
    // 只在環境變數設置時才同步
    if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
      return
    }
    
    const { data: members } = await insforge.database
      .from(TABLES.MEMBERS)
      .select('id, name, profession')
      .order('id', { ascending: true })
    
    if (members && members.length > 0) {
      const { syncMembersToSheets } = await import('@/lib/google-sheets')
      await syncMembersToSheets(members)
    }
  } catch (error) {
    // 靜默失敗，不影響主要操作
    console.warn('背景同步到 Google Sheets 失敗:', error)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data: body, error: parseError } = await safeJsonParse<{
      name?: string
      profession?: string
    }>(request)
    
    if (parseError || !body) {
      return apiError('請求格式錯誤：無法解析 JSON', 400)
    }

    const { name, profession } = body
    const id = parseInt(params.id)

    if (isNaN(id) || id <= 0) {
      return apiError('會員 ID 無效', 400)
    }

    if (!name) {
      return apiError('會員姓名為必填欄位', 400)
    }

    // 使用統一的驗證函數
    const validation = validateMember({ name, profession })
    if (!validation.valid) {
      return apiError(validation.error || '輸入驗證失敗', 400)
    }

    console.log('更新會員:', { id, name, profession })
    
    const { data, error } = await insforge.database
      .from(TABLES.MEMBERS)
      .update({
        name,
        profession: profession || null,
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('Database error updating member:', {
        error,
        message: error.message,
        code: (error as any).code,
        id,
      })
      
      return apiError(`更新會員失敗：${handleDatabaseError(error)}`, 500)
    }

    console.log('會員更新成功:', data)
    
    // 背景同步到 Google Sheets（不阻塞響應）
    syncToGoogleSheets().catch(err => {
      console.error('背景同步到 Google Sheets 失敗:', err)
    })
    
    return apiSuccess(data)
  } catch (error) {
    console.error('Error updating member:', error)
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return apiError('更新會員失敗，請稍後再試', 500)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    console.log('刪除會員 v5 - 直接刪除模式:', { id, timestamp: new Date().toISOString() })

    if (isNaN(id) || id <= 0) {
      return apiError('會員 ID 無效', 400)
    }

    // 直接嘗試刪除相關的簽到記錄（如果有的話）
    const { error: deleteCheckinsError } = await insforge.database
      .from(TABLES.CHECKINS)
      .delete()
      .eq('member_id', id)
    
    if (deleteCheckinsError) {
      console.warn('刪除相關簽到記錄時出錯（可能沒有記錄）:', deleteCheckinsError)
    }

    // 刪除相關的中獎記錄（如果有的話）
    const { error: deleteWinnersError } = await insforge.database
      .from(TABLES.LOTTERY_WINNERS)
      .delete()
      .eq('member_id', id)
    
    if (deleteWinnersError) {
      console.warn('刪除相關中獎記錄時出錯（可能沒有記錄）:', deleteWinnersError)
    }

    // 直接刪除會員，不先檢查是否存在
    const { data: deletedMembers, error: deleteError } = await insforge.database
      .from(TABLES.MEMBERS)
      .delete()
      .eq('id', id)
      .select()

    if (deleteError) {
      console.error('刪除會員時出錯:', { id, deleteError })
      return apiError(`刪除會員失敗：${handleDatabaseError(deleteError)}`, 500)
    }

    // 檢查是否真的刪除了記錄
    if (!deletedMembers || deletedMembers.length === 0) {
      console.warn('會員不存在或已被刪除:', { id })
      return apiError(`會員不存在（編號：${id}），可能已被刪除`, 404)
    }

    const member = deletedMembers[0]
    console.log('會員刪除成功:', { id, name: member.name })
    
    // 背景同步到 Google Sheets（不阻塞響應）
    syncToGoogleSheets().catch(err => {
      console.error('背景同步到 Google Sheets 失敗:', err)
    })
    
    return apiSuccess({ data: deletedMembers, deleted: true })
  } catch (error) {
    console.error('刪除會員時發生異常:', error)
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return apiError(`刪除會員失敗：${errorMessage}`, 500)
  }
}


