import { NextResponse } from 'next/server'
import { insforge, TABLES } from '@/lib/insforge'

export async function POST(request: Request) {
  try {
    const { id, name, profession } = await request.json()

    // 輸入驗證
    if (!id || !name) {
      return NextResponse.json(
        { error: 'ID and name are required' },
        { status: 400 }
      )
    }

    // 驗證ID是數字
    if (typeof id !== 'number' || id <= 0) {
      return NextResponse.json(
        { error: 'Invalid member ID' },
        { status: 400 }
      )
    }

    // 驗證名稱長度
    if (name.trim().length === 0 || name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be between 1 and 100 characters' },
        { status: 400 }
      )
    }

    // 驗證專業別長度
    if (profession && profession.length > 200) {
      return NextResponse.json(
        { error: 'Profession must be less than 200 characters' },
        { status: 400 }
      )
    }

    // 檢查ID是否已存在
    const { data: existing } = await insforge.database
      .from(TABLES.MEMBERS)
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Member ID already exists' },
        { status: 400 }
      )
    }

    const { error } = await insforge.database
      .from(TABLES.MEMBERS)
      .insert([{
        id,
        name: name.trim(),
        profession: (profession || '').trim() || null,
      }])

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating member:', error)
    return NextResponse.json(
      { error: 'Failed to create member' },
      { status: 500 }
    )
  }
}

