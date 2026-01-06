import { NextResponse } from 'next/server'
import { insforge, TABLES, BUCKETS } from '@/lib/insforge'

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
      // 刪除舊圖片
      if (existingPrize.image_key) {
        await insforge.storage
          .from(BUCKETS.PRIZES)
          .remove(existingPrize.image_key)
      }

      const fileExtension = imageFile.name.split('.').pop()
      const fileName = `prizes/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`
      
      const { data: uploadData, error: uploadError } = await insforge.storage
        .from(BUCKETS.PRIZES)
        .upload(fileName, imageFile)

      if (uploadError) {
        console.error('Error uploading image:', uploadError)
        return NextResponse.json(
          { error: 'Failed to upload image' },
          { status: 500 }
        )
      }

      if (uploadData) {
        imageUrl = uploadData.url
        imageKey = uploadData.key
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

    // 刪除圖片文件
    if (prize.image_key) {
      await insforge.storage
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

