import { NextResponse } from 'next/server'
import { insforge, TABLES, BUCKETS } from '@/lib/insforge'

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
        
        // 使用 upload 方法上傳
        const { data: uploadData, error: uploadError } = await insforge.storage
          .from(BUCKETS.PRIZES)
          .upload(fileName, blob)

        if (uploadError) {
          console.error('Error uploading image:', uploadError)
          return NextResponse.json(
            { error: `上傳失敗：${uploadError.message || '未知錯誤'}` },
            { status: 500 }
          )
        }

        if (uploadData) {
          imageUrl = uploadData.url || uploadData.publicUrl || ''
          imageKey = uploadData.key || fileName
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

    // 插入獎品資料
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
      console.error('Error creating prize:', insertError)
      return NextResponse.json(
        { error: 'Failed to create prize' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      id: prize?.id 
    })
  } catch (error) {
    console.error('Error creating prize:', error)
    return NextResponse.json(
      { error: 'Failed to create prize' },
      { status: 500 }
    )
  }
}

