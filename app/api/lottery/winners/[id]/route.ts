import { NextResponse } from 'next/server'
import { supabase, supabaseService, TABLES } from '@/lib/supabase'
import { apiError, apiSuccess } from '@/lib/api-utils'

// 標記為動態路由
export const dynamic = 'force-dynamic'

// 更新領取狀態
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Next.js 15+ 使用 Promise
    const resolvedParams = await params
    const id = parseInt(resolvedParams.id)
    
    if (isNaN(id) || id <= 0) {
      console.error('❌ 無效的 ID:', resolvedParams.id)
      return apiError('中獎記錄 ID 無效', 400)
    }

    let body: any = {}
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('❌ JSON 解析失敗:', parseError)
      return apiError('請求格式錯誤：無法解析 JSON', 400)
    }

    const { claimed_status } = body

    console.log('📝 收到更新請求:', { id, claimed_status, body })

    if (!claimed_status || !['pending', 'claimed'].includes(claimed_status)) {
      console.error('❌ 無效的領取狀態:', claimed_status)
      return apiError('領取狀態無效，必須是 pending 或 claimed', 400)
    }
    
    console.log('🔄 更新中獎記錄領取狀態:', { id, claimed_status, table: TABLES.LOTTERY_WINNERS })

    // 先查詢記錄是否存在
    const { data: existingWinner, error: fetchError } = await supabaseService
      .from(TABLES.LOTTERY_WINNERS)
      .select('id, claimed_status')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('❌ 查詢記錄失敗:', fetchError)
      return apiError(`查詢中獎記錄失敗：${fetchError.message}`, 500)
    }

    if (!existingWinner) {
      console.warn('⚠️ 記錄不存在:', { id })
      return apiError(`中獎記錄不存在（ID：${id}）`, 404)
    }

    console.log('📋 找到記錄，當前狀態:', { id, currentStatus: existingWinner.claimed_status, newStatus: claimed_status })

    // 使用服務端客戶端更新
    const { data: updatedWinner, error: updateError } = await supabaseService
      .from(TABLES.LOTTERY_WINNERS)
      .update({ 
        claimed_status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ 更新失敗:', {
        error: updateError,
        message: updateError.message,
        code: (updateError as any).code,
        details: (updateError as any).details,
        id,
        claimed_status,
      })
      return apiError(`更新領取狀態失敗：${updateError.message}`, 500)
    }

    if (!updatedWinner) {
      console.error('❌ 更新未返回數據:', { id })
      return apiError(`更新失敗：未返回更新後的記錄`, 500)
    }

    // 驗證更新是否成功
    const { data: verifyWinner, error: verifyError } = await supabaseService
      .from(TABLES.LOTTERY_WINNERS)
      .select('id, claimed_status')
      .eq('id', id)
      .maybeSingle()

    if (verifyError) {
      console.warn('⚠️ 驗證更新時出錯（可能無關緊要）:', verifyError)
    } else if (verifyWinner && verifyWinner.claimed_status !== claimed_status) {
      console.error('❌ 更新驗證失敗：狀態未改變！', {
        id,
        expected: claimed_status,
        actual: verifyWinner.claimed_status,
      })
      return apiError(`更新失敗：狀態未成功更新`, 500)
    }

    console.log('✅ 領取狀態更新成功:', {
      id: updatedWinner.id,
      claimed_status: updatedWinner.claimed_status,
      verified: verifyWinner?.claimed_status === claimed_status,
    })
    return apiSuccess({ data: updatedWinner })
  } catch (error) {
    console.error('❌ 更新領取狀態異常:', error)
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return apiError(`更新領取狀態失敗：${errorMessage}`, 500)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Next.js 15+ 使用 Promise
    const resolvedParams = await params
    const id = parseInt(resolvedParams.id)
    
    if (isNaN(id) || id <= 0) {
      return apiError('中獎記錄 ID 無效', 400)
    }
    
    console.log('刪除中獎記錄:', { id, timestamp: new Date().toISOString(), table: TABLES.LOTTERY_WINNERS })

    // 先查詢記錄是否存在（含 prize_id 以恢復獎品庫存）
    const { data: existingWinner, error: fetchError } = await supabaseService
      .from(TABLES.LOTTERY_WINNERS)
      .select('id, member_id, prize_id, meeting_date')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching winner before delete:', fetchError)
      return apiError(`查詢中獎記錄失敗：${fetchError.message}`, 500)
    }

    if (!existingWinner) {
      console.warn('Winner not found:', { id })
      return apiError(`中獎記錄不存在（ID：${id}），可能已被刪除`, 404)
    }

    console.log('找到要刪除的記錄:', existingWinner)

    // 恢復獎品庫存（刪除中獎記錄時應加回 1）
    const prizeId = (existingWinner as any).prize_id
    if (prizeId) {
      const { data: prizeData } = await supabaseService
        .from(TABLES.PRIZES)
        .select('id, remaining_quantity')
        .eq('id', prizeId)
        .maybeSingle()
      if (prizeData) {
        const newQty = Math.max(0, (prizeData as any).remaining_quantity || 0) + 1
        await supabaseService
          .from(TABLES.PRIZES)
          .update({ remaining_quantity: newQty, updated_at: new Date().toISOString() })
          .eq('id', prizeId)
        console.log('✅ 獎品庫存已恢復:', { prizeId, newQty })
      }
    }

    // 使用服務端客戶端刪除（避免 RLS 限制）
    const { data: deletedWinners, error: deleteError } = await supabaseService
      .from(TABLES.LOTTERY_WINNERS)
      .delete()
      .eq('id', id)
      .select()

    if (deleteError) {
      console.error('Error deleting winner:', {
        error: deleteError,
        message: deleteError.message,
        code: (deleteError as any).code,
        details: (deleteError as any).details,
        id,
      })
      return apiError(`刪除中獎記錄失敗：${deleteError.message}`, 500)
    }

    // 檢查是否真的刪除了記錄
    if (!deletedWinners || deletedWinners.length === 0) {
      console.error('刪除操作未返回數據，但記錄應該存在:', { id, existingWinner })
      return apiError(`刪除失敗：記錄未成功刪除`, 500)
    }

    console.log('✅ 中獎記錄刪除成功:', {
      deletedCount: deletedWinners.length,
      deletedIds: deletedWinners.map(w => w.id),
      originalId: id,
    })

    // 驗證刪除是否真的成功（再次查詢確認）
    const { data: verifyWinner, error: verifyError } = await supabaseService
      .from(TABLES.LOTTERY_WINNERS)
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (verifyError) {
      console.warn('驗證刪除時出錯（可能無關緊要）:', verifyError)
    } else if (verifyWinner) {
      console.error('❌ 刪除驗證失敗：記錄仍然存在！', { id, verifyWinner })
      return apiError(`刪除失敗：記錄仍然存在於資料庫中`, 500)
    } else {
      console.log('✅ 刪除驗證成功：記錄已不存在')
    }

    return apiSuccess({ deleted: true, data: deletedWinners })
  } catch (error) {
    console.error('Error deleting winner:', error)
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return apiError(`刪除中獎記錄失敗：${errorMessage}`, 500)
  }
}
