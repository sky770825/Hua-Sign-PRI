import { NextResponse } from 'next/server'
import { insforge, insforgeService, TABLES, BUCKETS } from '@/lib/insforge'

export async function GET() {
  try {
    const { data: prizes, error } = await insforge.database
      .from(TABLES.PRIZES)
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ prizes: prizes || [] })
  } catch (error) {
    console.error('Error fetching prizes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prizes' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
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

    let imageUrl = ''
    let imageKey = ''

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
        
        // 先嘗試檢查儲存桶是否存在（可選，用於診斷）
        try {
          // 使用服務端客戶端上傳（避免外鍵約束錯誤）
          const uploadResult = await insforgeService.storage
            .from(BUCKETS.PRIZES)
            .upload(fileName, blob)
          
          console.log('上傳結果:', {
            hasData: !!uploadResult.data,
            hasError: !!uploadResult.error,
            data: uploadResult.data,
            error: uploadResult.error,
            bucket: BUCKETS.PRIZES,
          })

          const { data: uploadData, error: uploadError } = uploadResult

          if (uploadError) {
            // 詳細記錄錯誤信息
            const errorDetails = {
              error: uploadError,
              message: uploadError.message || '未知錯誤',
              code: (uploadError as any).code || '',
              status: (uploadError as any).status || '',
              details: (uploadError as any).details || '',
              fileName,
              bucket: BUCKETS.PRIZES,
              serviceKeySet: !!process.env.INFORGE_SERVICE_KEY,
              blobSize: blob.size,
              blobType: blob.type,
            }
            
            console.error('圖片上傳錯誤詳情:', JSON.stringify(errorDetails, null, 2))
            
            // 檢查是否為速率限制錯誤
            const errorMessage = String(uploadError.message || uploadError || '未知錯誤')
            const errorCode = String((uploadError as any).code || '')
            const errorStatus = String((uploadError as any).status || '')
            
            if (errorMessage.includes('Too many requests') || 
                errorMessage.includes('rate limit') ||
                errorMessage.includes('429') ||
                errorCode === '429' ||
                errorStatus === '429') {
              return NextResponse.json(
                { error: '請求過於頻繁，請稍候 1-2 分鐘後再試' },
                { status: 429 }
              )
            }
            
            // 檢查是否為儲存桶不存在或權限問題
            if (errorMessage.includes('bucket') || 
                errorMessage.includes('not found') ||
                errorMessage.includes('does not exist') ||
                errorMessage.includes('permission') ||
                errorMessage.includes('access denied') ||
                errorMessage.includes('forbidden') ||
                errorMessage.includes('foreign key') ||
                errorCode === '404' ||
                errorCode === '403' ||
                errorStatus === '404' ||
                errorStatus === '403') {
              return NextResponse.json(
                { 
                  error: `儲存桶問題：${errorMessage}。請確認：1) 儲存桶名稱 "${BUCKETS.PRIZES}" 是否正確 2) 儲存桶是否存在 3) 儲存桶權限是否正確 4) INFORGE_SERVICE_KEY 是否已設置`,
                  details: errorDetails
                },
                { status: 500 }
              )
            }
            
            return NextResponse.json(
              { 
                error: `上傳失敗：${errorMessage}${errorCode ? ` (錯誤碼: ${errorCode})` : ''}${errorStatus ? ` (狀態碼: ${errorStatus})` : ''}`,
                details: errorDetails
              },
              { status: 500 }
            )
          }
          
          // 處理成功的情況
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
        } catch (uploadException) {
          // 捕獲上傳過程中的異常
          console.error('上傳過程發生異常:', {
            exception: uploadException,
            message: uploadException instanceof Error ? uploadException.message : String(uploadException),
            stack: uploadException instanceof Error ? uploadException.stack : undefined,
            fileName,
            bucket: BUCKETS.PRIZES,
            serviceKeySet: !!process.env.INFORGE_SERVICE_KEY,
          })
          
          return NextResponse.json(
            { 
              error: `上傳過程發生異常：${uploadException instanceof Error ? uploadException.message : String(uploadException)}`,
              type: 'upload_exception'
            },
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

    // 插入獎品資料
    console.log('創建獎品:', { name, totalQuantity, probability, imageUrl: !!imageUrl })
    
    const { data: prize, error: insertError } = await insforge.database
      .from(TABLES.PRIZES)
      .insert([{
        name,
        image_url: imageUrl || null,
        image_key: imageKey || null,
        total_quantity: totalQuantity,
        remaining_quantity: totalQuantity,
        probability,
      }])
      .select()
      .single()

    if (insertError) {
      console.error('Error creating prize:', {
        error: insertError,
        message: insertError.message,
        code: (insertError as any).code,
        details: (insertError as any).details,
        name,
      })
      
      return NextResponse.json(
        { error: `新增獎品失敗：${insertError.message || '資料庫錯誤'}` },
        { status: 500 }
      )
    }

    console.log('獎品創建成功:', prize)
    return NextResponse.json({ 
      success: true, 
      id: prize?.id,
      data: prize
    })
  } catch (error) {
    console.error('Error creating prize:', error)
    return NextResponse.json(
      { error: 'Failed to create prize' },
      { status: 500 }
    )
  }
}

