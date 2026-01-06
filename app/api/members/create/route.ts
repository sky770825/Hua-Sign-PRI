import { NextResponse } from 'next/server'
import { insforge, TABLES } from '@/lib/insforge'

// 標記為動態路由
export const dynamic = 'force-dynamic'

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

    console.log('創建會員:', { id, name, profession })
    
    const { data, error } = await insforge.database
      .from(TABLES.MEMBERS)
      .insert([{
        id,
        name: name.trim(),
        profession: (profession || '').trim() || null,
      }])
      .select()
      .single()

    if (error) {
      console.error('Database error creating member:', {
        error,
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        id,
        name,
      })
      
      // 檢查是否為重複 ID 錯誤
      const errorMessage = String(error.message || '')
      const errorCode = String((error as any).code || '')
      
      if (errorCode === '23505' || 
          errorMessage.includes('duplicate') || 
          errorMessage.includes('unique') ||
          errorMessage.includes('already exists')) {
        return NextResponse.json(
          { error: '會員編號已存在，請使用其他編號' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: `新增會員失敗：${errorMessage || '資料庫錯誤'}` },
        { status: 500 }
      )
    }

    if (!data) {
      console.error('會員創建失敗：沒有返回數據')
      return NextResponse.json(
        { error: '新增會員失敗：資料庫未返回數據' },
        { status: 500 }
      )
    }

    console.log('會員創建成功:', data)
    
    // 驗證返回的數據是否完整
    if (!data || !data.id || !data.name) {
      console.error('會員創建成功但返回數據不完整:', data)
      return NextResponse.json(
        { error: '新增會員失敗：資料庫返回數據不完整' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true, 
      data: data,
      member: data, // 同時返回 member 字段以確保兼容性
      id: data.id, // 明確返回 ID 以便前端驗證
    })
  } catch (error) {
    console.error('Error creating member:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create member'
    // 如果是已知錯誤，返回詳細訊息
    if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
      return NextResponse.json(
        { error: '會員編號已存在，請使用其他編號' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: errorMessage.includes('Member ID already exists') ? '會員編號已存在' : '新增會員失敗，請稍後再試' },
      { status: 500 }
    )
  }
}

