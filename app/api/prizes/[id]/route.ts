import { NextResponse } from 'next/server'
import { insforge, insforgeService, TABLES, BUCKETS } from '@/lib/insforge'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData()
    const id = parseInt(params.id)
    const name = formData.get('name') as string
    const totalQuantity = parseInt(formData.get('totalQuantity') as string) || 0
    const probability = parseFloat(formData.get('probability') as string) || 0.0
    const imageFile = formData.get('image') as File | null

    if (!name) {
      return NextResponse.json(
        { error: 'Prize name is required' },
        { status: 400 }
      )
    }

    // 獲取現有獎品信息
    const { data: existingPrize, error: fetchError } = await insforge.database
      .from(TABLES.PRIZES)
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingPrize) {
      return NextResponse.json(
        { error: 'Prize not found' },
        { status: 404 }
      )
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
              errorCode === '404' ||
              errorCode === '403') {
            return NextResponse.json(
              { error: '儲存桶不存在或無權限，請檢查 Insforge 設置' },
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
            return NextResponse.json(
              { error: '上傳成功但無法獲取圖片 URL，請檢查 Insforge Storage 設置' },
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
        return NextResponse.json(
          { error: `處理圖片時發生錯誤：${error instanceof Error ? error.message : '未知錯誤'}` },
          { status: 500 }
        )
      }
    }

    // 計算剩餘數量
    const usedQuantity = existingPrize.total_quantity - existingPrize.remaining_quantity
    const newRemainingQuantity = Math.max(0, totalQuantity - usedQuantity)

    const { error: updateError } = await insforge.database
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

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating prize:', error)
    return NextResponse.json(
      { error: 'Failed to update prize' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    const { data: prize, error: fetchError } = await insforge.database
      .from(TABLES.PRIZES)
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !prize) {
      return NextResponse.json(
        { error: 'Prize not found' },
        { status: 404 }
      )
    }

    // 刪除圖片文件（使用服務端客戶端）
    if (prize.image_key) {
      await insforgeService.storage
        .from(BUCKETS.PRIZES)
        .remove(prize.image_key)
    }

    const { error: deleteError } = await insforge.database
      .from(TABLES.PRIZES)
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting prize:', error)
    return NextResponse.json(
      { error: 'Failed to delete prize' },
      { status: 500 }
    )
  }
}

