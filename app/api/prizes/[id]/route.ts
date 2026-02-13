import { NextResponse } from 'next/server'
import { supabase, supabaseService, TABLES, BUCKETS } from '@/lib/supabase'
import { apiError, apiSuccess, handleDatabaseError, requireSameOrigin } from '@/lib/api-utils'
import { clearCacheByPrefix, CacheKeys } from '@/lib/cache'
// 移除 validatePrize 導入，改用直接驗證

export const dynamic = 'force-dynamic'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const originCheck = requireSameOrigin(request)
    if (originCheck) return originCheck

    // Next.js 15+ 使用 Promise
    const resolvedParams = await params
    const formData = await request.formData()
    const id = parseInt(resolvedParams.id)
    
    if (isNaN(id) || id <= 0) {
      return apiError('獎品 ID 無效', 400)
    }
    
    const name = formData.get('name') as string
    const totalQuantity = parseInt(formData.get('totalQuantity') as string) || 0
    const addStock = parseInt(formData.get('addStock') as string) || 0 // 補庫存數量
    const adjustTotalQuantity = parseInt(formData.get('adjustTotalQuantity') as string) || 0 // 調整總數量上限
    const completionMessage = (formData.get('completionMessage') as string) || '感謝大家的參與！'
    const imageFile = formData.get('image') as File | null

    if (!name) {
      return apiError('獎品名稱為必填欄位', 400)
    }

    // 驗證基本欄位
    if (!name || name.trim() === '') {
      return apiError('獎品名稱為必填欄位', 400)
    }
    if (totalQuantity < 1) {
      return apiError('總數量必須大於 0', 400)
    }
    if (addStock < 0) {
      return apiError('補庫存數量不能為負數', 400)
    }

    // 獲取現有獎品信息（不使用 single/maybeSingle，直接檢查結果陣列）
    // 使用 supabaseService（service_role key）以繞過 RLS
    const { data: prizes, error: fetchError } = await supabaseService
      .from(TABLES.PRIZES)
      .select('*')
      .eq('id', id)
      .limit(1)

    if (fetchError) {
      console.error('Error fetching prize:', fetchError)
      return apiError(`查詢獎品失敗：${handleDatabaseError(fetchError)}`, 500)
    }
    
    const existingPrize = prizes && prizes.length > 0 ? prizes[0] : null
    
    if (!existingPrize) {
      return apiError(`獎品不存在（ID：${id}），可能已被刪除`, 404)
    }
    
    // 計算新的總數量（如果有調整上限）
    const finalTotalQuantity = adjustTotalQuantity !== 0 
      ? Math.max(1, existingPrize.total_quantity + adjustTotalQuantity)
      : totalQuantity
    
    if (finalTotalQuantity < 1) {
      return apiError('總數量不能小於 1', 400)
    }

    let imageUrl = existingPrize.image_url
    let imageKey = existingPrize.image_key

    // 處理圖片上傳到 Supabase Storage
    if (imageFile && imageFile.size > 0) {
      try {
        // 檢查檔案大小（限制為 50MB，因為前端會自動壓縮）
        const maxSize = 50 * 1024 * 1024 // 50MB（Supabase 免費方案限制）
        if (imageFile.size > maxSize) {
          return NextResponse.json(
            { error: '圖片檔案過大，請選擇小於 50MB 的圖片（系統會自動壓縮）' },
            { status: 400 }
          )
        }

        // 檢查檔案類型
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(imageFile.type)) {
          return NextResponse.json(
            { error: '不支援的圖片格式，請使用 JPG、PNG、GIF 或 WebP' },
            { status: 400 }
          )
        }

        // 刪除舊圖片（使用服務端客戶端）
        if (existingPrize.image_key) {
          try {
            await supabaseService.storage
              .from(BUCKETS.PRIZES)
              .remove([existingPrize.image_key])
          } catch (removeError) {
            // 忽略刪除錯誤，繼續上傳新圖片
            console.warn('Failed to remove old image:', removeError)
          }
        }

        // 生成檔案名稱（只使用英數字和底線，避免特殊字符問題）
        const fileExtension = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
        const sanitizedExtension = fileExtension.replace(/[^a-z0-9]/g, '')
        const fileName = `prizes/${Date.now()}-${Math.random().toString(36).substring(7)}.${sanitizedExtension}`
        
        // 將 File 轉換為 ArrayBuffer（Supabase Storage 需要）
        const arrayBuffer = await imageFile.arrayBuffer()
        
        console.log('開始上傳圖片到 Supabase Storage:', {
          fileName,
          fileSize: imageFile.size,
          fileType: imageFile.type,
          bucket: BUCKETS.PRIZES,
          serviceKeySet: !!process.env.SUPABASE_SERVICE_KEY,
        })
        
        // 使用服務端客戶端上傳到 Supabase Storage
        const uploadResult = await supabaseService.storage
          .from(BUCKETS.PRIZES)
          .upload(fileName, arrayBuffer, {
            contentType: imageFile.type,
            upsert: false
          })
        
        console.log('上傳結果:', {
          hasData: !!uploadResult.data,
          hasError: !!uploadResult.error,
          data: uploadResult.data,
          error: uploadResult.error,
        })

        const { data: uploadData, error: uploadError } = uploadResult

        if (uploadError) {
          console.error('圖片上傳錯誤詳情:', {
            error: uploadError,
            message: uploadError.message,
            code: (uploadError as any).code,
            details: (uploadError as any).details,
            fileName,
            bucket: BUCKETS.PRIZES,
            serviceKeySet: !!process.env.SUPABASE_SERVICE_KEY,
          })
          
          // 檢查是否為速率限制錯誤
          const errorMessage = uploadError.message || String(uploadError)
          const errorCode = (uploadError as any).code || ''
          
          if (errorMessage.includes('Too many requests') || 
              errorMessage.includes('rate limit') ||
              errorMessage.includes('429') ||
              errorCode === '429') {
            return NextResponse.json(
              { error: '請求過於頻繁，請稍候 1-2 分鐘後再試' },
              { status: 429 }
            )
          }
          
          // 檢查是否為儲存桶不存在或權限問題
          if (errorMessage.includes('bucket') || 
              errorMessage.includes('not found') ||
              errorMessage.includes('permission') ||
              errorMessage.includes('access denied') ||
              errorMessage.includes('foreign key') ||
              errorCode === '404' ||
              errorCode === '403') {
            return NextResponse.json(
              { error: '儲存桶不存在或無權限，請檢查 Supabase 設置。如果使用匿名 key，請設置 SUPABASE_SERVICE_KEY 環境變數。' },
              { status: 500 }
            )
          }
          
          return NextResponse.json(
            { error: `上傳失敗：${errorMessage}${errorCode ? ` (錯誤碼: ${errorCode})` : ''}` },
            { status: 500 }
          )
        }

        if (uploadData) {
          // Supabase Storage 返回 path，需要構建公開 URL
          imageKey = uploadData.path || fileName
          
          // 構建 Supabase Storage 公開 URL
          const { data: publicUrlData } = supabaseService.storage
            .from(BUCKETS.PRIZES)
            .getPublicUrl(imageKey)
          
          imageUrl = publicUrlData.publicUrl || ''
          
          // 如果無法獲取公開 URL，手動構建
          if (!imageUrl) {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
            imageUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKETS.PRIZES}/${imageKey}`
          }
          
          console.log('上傳成功:', {
            imageUrl,
            imageKey,
            uploadData,
          })
          
          if (!imageUrl) {
            return NextResponse.json(
              { error: '上傳成功但無法獲取圖片 URL，請檢查 Supabase Storage 設置' },
              { status: 500 }
            )
          }
        } else {
          console.error('Upload succeeded but no data returned')
          return NextResponse.json(
            { error: '上傳成功但無法獲取圖片 URL' },
            { status: 500 }
          )
        }
      } catch (error) {
        console.error('Error processing image upload:', error)
        const errorMessage = error instanceof Error ? error.message : '未知錯誤'
        return apiError(`處理圖片時發生錯誤：${errorMessage}`, 500)
      }
    }

    // 計算剩餘數量
    // 如果有補庫存，直接增加剩餘數量；否則保持原有邏輯
    let newRemainingQuantity: number
    if (addStock > 0) {
      // 補庫存：在現有剩餘數量基礎上增加
      newRemainingQuantity = existingPrize.remaining_quantity + addStock
      // 確保不超過新的總數量
      newRemainingQuantity = Math.min(newRemainingQuantity, finalTotalQuantity)
    } else {
      // 正常更新：計算剩餘數量
      const usedQuantity = existingPrize.total_quantity - existingPrize.remaining_quantity
      newRemainingQuantity = Math.max(0, finalTotalQuantity - usedQuantity)
    }

    console.log('更新獎品:', { 
      id, 
      name, 
      originalTotalQuantity: existingPrize.total_quantity,
      adjustTotalQuantity,
      finalTotalQuantity,
      addStock, 
      originalRemainingQuantity: existingPrize.remaining_quantity,
      newRemainingQuantity 
    })
    
    // 使用 supabaseService（service_role key）以繞過 RLS
    const { data, error: updateError } = await supabaseService
      .from(TABLES.PRIZES)
      .update({
        name,
        image_url: imageUrl,
        image_key: imageKey,
        total_quantity: finalTotalQuantity, // 使用調整後的總數量
        remaining_quantity: newRemainingQuantity,
        // 機率固定為 1.0（平均隨機）
        probability: 1.0,
        completion_message: completionMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()

    if (updateError) {
      console.error('Error updating prize:', {
        error: updateError,
        message: updateError.message,
        code: (updateError as any).code,
        id,
      })
      
      return apiError(`更新獎品失敗：${handleDatabaseError(updateError)}`, 500)
    }

    console.log('獎品更新成功:', data)
    
    // 清除獎品相關快取
    clearCacheByPrefix('prizes:')
    
    return apiSuccess(data)
  } catch (error) {
    console.error('Error updating prize:', error)
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return apiError(`更新獎品失敗：${errorMessage}`, 500)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const originCheck = requireSameOrigin(request)
    if (originCheck) return originCheck

    // Next.js 15+ 使用 Promise
    const resolvedParams = await params
    const id = parseInt(resolvedParams.id)
    
    if (isNaN(id) || id <= 0) {
      console.error('無效的獎品 ID:', { rawId: resolvedParams.id, parsedId: id })
      return apiError('獎品 ID 無效', 400)
    }
    
    console.log('刪除獎品:', { id, rawId: resolvedParams.id })

    // 使用 supabaseService（service_role key）以繞過 RLS
    const { data: prizes, error: fetchError } = await supabaseService
      .from(TABLES.PRIZES)
      .select('*')
      .eq('id', id)
      .limit(1)

    if (fetchError) {
      console.error('Error fetching prize:', { id, fetchError })
      return apiError(`查詢獎品失敗：${handleDatabaseError(fetchError)}`, 500)
    }
    
    const prize = prizes && prizes.length > 0 ? prizes[0] : null
    
    if (!prize) {
      console.warn('Prize not found:', { id })
      return apiError(`獎品不存在（ID：${id}），可能已被刪除`, 404)
    }

    // 檢查是否有中獎記錄引用此獎品（使用 supabaseService）
    const { data: winners, error: winnersError } = await supabaseService
      .from(TABLES.LOTTERY_WINNERS)
      .select('id')
      .eq('prize_id', id)
      .limit(1)

    if (winnersError) {
      console.warn('Error checking winners:', winnersError)
      // 繼續嘗試刪除，如果真的有外鍵約束，資料庫會阻止
    }

    if (winners && winners.length > 0) {
      console.log('獎品有中獎記錄，無法刪除:', { 
        id, 
        prizeName: prize.name,
        winnerCount: winners.length 
      })
      
      // 先刪除相關的中獎記錄（使用 supabaseService）
      const { error: deleteWinnersError } = await supabaseService
        .from(TABLES.LOTTERY_WINNERS)
        .delete()
        .eq('prize_id', id)
      
      if (deleteWinnersError) {
        console.error('Error deleting winners:', deleteWinnersError)
        return apiError(`無法刪除獎品：此獎品有 ${winners.length} 筆中獎記錄，且無法自動刪除。請先手動刪除相關中獎記錄。`, 400)
      }
      
      console.log('相關中獎記錄已刪除，繼續刪除獎品')
    }

    // 刪除圖片文件（使用服務端客戶端）
    if (prize.image_key) {
      try {
        const { error: removeError } = await supabaseService.storage
          .from(BUCKETS.PRIZES)
          .remove([prize.image_key])
        
        if (removeError) {
          console.warn('Failed to remove image:', removeError)
          // 繼續刪除獎品，即使圖片刪除失敗
        } else {
          console.log('圖片已刪除')
        }
      } catch (removeException) {
        console.warn('Exception removing image:', removeException)
        // 繼續刪除獎品
      }
    }

    // 刪除獎品（使用 supabaseService 以繞過 RLS）
    const { data: deletedPrize, error: deleteError } = await supabaseService
      .from(TABLES.PRIZES)
      .delete()
      .eq('id', id)
      .select()

    if (deleteError) {
      console.error('Error deleting prize:', {
        error: deleteError,
        message: deleteError.message,
        code: (deleteError as any).code,
        details: (deleteError as any).details,
        id,
        prizeName: prize.name,
      })
      
      return apiError(`刪除獎品失敗：${handleDatabaseError(deleteError)}`, 500)
    }

    console.log('獎品刪除成功:', deletedPrize)
    
    // 清除獎品相關快取
    clearCacheByPrefix('prizes:')
    
    return apiSuccess(deletedPrize)
  } catch (error) {
    console.error('Error deleting prize:', error)
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return apiError(`刪除獎品失敗：${handleDatabaseError(error)}`, 500)
  }
}
