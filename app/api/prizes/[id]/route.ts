import { NextResponse } from 'next/server'
import { insforge, insforgeService, TABLES, BUCKETS } from '@/lib/insforge'
import { apiError, apiSuccess, handleDatabaseError } from '@/lib/api-utils'
import { validatePrize } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData()
    const id = parseInt(params.id)
    
    if (isNaN(id) || id <= 0) {
      return apiError('獎品 ID 無效', 400)
    }
    
    const name = formData.get('name') as string
    const totalQuantity = parseInt(formData.get('totalQuantity') as string) || 0
    const probability = parseFloat(formData.get('probability') as string) || 0.0
    const imageFile = formData.get('image') as File | null

    if (!name) {
      return apiError('獎品名稱為必填欄位', 400)
    }

    // 使用統一的驗證函數
    const validation = validatePrize({ name, totalQuantity, probability })
    if (!validation.valid) {
      return apiError(validation.error || '輸入驗證失敗', 400)
    }

    // 獲取現有獎品信息
    const { data: existingPrize, error: fetchError } = await insforge.database
      .from(TABLES.PRIZES)
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Error fetching prize:', fetchError)
      return apiError(`查詢獎品失敗：${handleDatabaseError(fetchError)}`, 500)
    }
    
    if (!existingPrize) {
      return apiError(`獎品不存在（ID：${id}）`, 404)
    }

    let imageUrl = existingPrize.image_url
    let imageKey = existingPrize.image_key

    // 處理圖片上傳到 Insforge Storage
    if (imageFile && imageFile.size > 0) {
      try {
        // 檢查檔案大小（限制為 5MB）
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (imageFile.size > maxSize) {
          return NextResponse.json(
            { error: '圖片檔案過大，請選擇小於 5MB 的圖片' },
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
            await insforgeService.storage
              .from(BUCKETS.PRIZES)
              .remove(existingPrize.image_key)
          } catch (removeError) {
            // 忽略刪除錯誤，繼續上傳新圖片
            console.warn('Failed to remove old image:', removeError)
          }
        }

        // 生成檔案名稱（只使用英數字和底線，避免特殊字符問題）
        const fileExtension = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
        const sanitizedExtension = fileExtension.replace(/[^a-z0-9]/g, '')
        const fileName = `prizes/${Date.now()}-${Math.random().toString(36).substring(7)}.${sanitizedExtension}`
        
        // 將 File 轉換為 Blob（Insforge Storage 需要 Blob 類型）
        const arrayBuffer = await imageFile.arrayBuffer()
        const blob = new Blob([arrayBuffer], { type: imageFile.type })
        
        console.log('開始上傳圖片:', {
          fileName,
          fileSize: imageFile.size,
          fileType: imageFile.type,
          bucket: BUCKETS.PRIZES,
          serviceKeySet: !!process.env.INFORGE_SERVICE_KEY,
        })
        
        // 使用服務端客戶端上傳（避免外鍵約束錯誤）
        const uploadResult = await insforgeService.storage
          .from(BUCKETS.PRIZES)
          .upload(fileName, blob)
        
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
            serviceKeySet: !!process.env.INFORGE_SERVICE_KEY,
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
              { error: '儲存桶不存在或無權限，請檢查 Insforge 設置。如果使用匿名 key，請設置 INFORGE_SERVICE_KEY 環境變數。' },
              { status: 500 }
            )
          }
          
          return NextResponse.json(
            { error: `上傳失敗：${errorMessage}${errorCode ? ` (錯誤碼: ${errorCode})` : ''}` },
            { status: 500 }
          )
        }

        if (uploadData) {
          // Insforge 可能返回不同的數據結構，嘗試多種方式獲取 URL
          imageUrl = uploadData.url || 
                     (uploadData as any).publicUrl || 
                     (uploadData as any).signedUrl || 
                     ''
          imageKey = uploadData.key || 
                    (uploadData as any).path || 
                    fileName
          
          console.log('上傳成功:', {
            imageUrl,
            imageKey,
            uploadData,
          })
          
          if (!imageUrl) {
            console.error('上傳成功但無法獲取圖片 URL:', uploadData)
            // 嘗試手動構建 URL（如果知道 baseUrl）
            const baseUrl = 'https://dsfp4gvz.us-east.insforge.app'
            if (imageKey) {
              imageUrl = `${baseUrl}/storage/v1/object/public/${BUCKETS.PRIZES}/${imageKey}`
              console.log('使用手動構建的 URL:', imageUrl)
            } else {
              return NextResponse.json(
                { error: '上傳成功但無法獲取圖片 URL，請檢查 Insforge Storage 設置' },
                { status: 500 }
              )
            }
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
    const usedQuantity = existingPrize.total_quantity - existingPrize.remaining_quantity
    const newRemainingQuantity = Math.max(0, totalQuantity - usedQuantity)

    console.log('更新獎品:', { id, name, totalQuantity, probability })
    
    const { data, error: updateError } = await insforge.database
      .from(TABLES.PRIZES)
      .update({
        name,
        image_url: imageUrl,
        image_key: imageKey,
        total_quantity: totalQuantity,
        remaining_quantity: newRemainingQuantity,
        probability,
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
    return apiSuccess(data)
  } catch (error) {
    console.error('Error updating prize:', error)
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return apiError(`更新獎品失敗：${errorMessage}`, 500)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id) || id <= 0) {
      return apiError('獎品 ID 無效', 400)
    }
    
    console.log('刪除獎品:', { id })

    const { data: prize, error: fetchError } = await insforge.database
      .from(TABLES.PRIZES)
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Error fetching prize:', { id, fetchError })
      return apiError(`查詢獎品失敗：${handleDatabaseError(fetchError)}`, 500)
    }
    
    if (!prize) {
      console.warn('Prize not found:', { id })
      return apiError(`獎品不存在（ID：${id}）`, 404)
    }

    // 檢查是否有中獎記錄引用此獎品
    const { data: winners, error: winnersError } = await insforge.database
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
      
      // 先刪除相關的中獎記錄
      const { error: deleteWinnersError } = await insforge.database
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
        const { error: removeError } = await insforgeService.storage
          .from(BUCKETS.PRIZES)
          .remove(prize.image_key)
        
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

    // 刪除獎品
    const { data: deletedPrize, error: deleteError } = await insforge.database
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
      
      const errorMessage = String(deleteError.message || '')
      const errorCode = String((deleteError as any).code || '')
      
      // 檢查是否為外鍵約束錯誤
      if (errorCode === '23503' || 
          errorMessage.includes('foreign key') || 
          errorMessage.includes('constraint') ||
          errorMessage.includes('referenced')) {
        return NextResponse.json(
          { error: '無法刪除獎品：此獎品有中獎記錄，請先刪除相關中獎記錄。系統已嘗試自動刪除，但可能仍有其他引用。' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: `刪除獎品失敗：${errorMessage || '資料庫錯誤'} (錯誤碼: ${errorCode})` },
        { status: 500 }
      )
    }

    console.log('獎品刪除成功:', deletedPrize)
    return NextResponse.json({ success: true, data: deletedPrize })
  } catch (error) {
    console.error('Error deleting prize:', error)
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    
    // 檢查是否為外鍵約束錯誤
    if (errorMessage.includes('foreign key') || errorMessage.includes('constraint')) {
      return NextResponse.json(
        { error: '無法刪除獎品：此獎品有中獎記錄，請先刪除相關中獎記錄。' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: `刪除獎品失敗：${errorMessage}` },
      { status: 500 }
    )
  }
}

