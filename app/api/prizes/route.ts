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

