import { NextResponse } from 'next/server'
import { insforge, TABLES } from '@/lib/insforge'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name, profession } = await request.json()
    const id = parseInt(params.id)

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    console.log('更新會員:', { id, name, profession })
    
    const { data, error } = await insforge.database
      .from(TABLES.MEMBERS)
      .update({
        name,
        profession: profession || null,
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('Database error updating member:', {
        error,
        message: error.message,
        code: (error as any).code,
        id,
      })
      
      return NextResponse.json(
        { error: `更新會員失敗：${error.message || '資料庫錯誤'}` },
        { status: 500 }
      )
    }

    console.log('會員更新成功:', data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error updating member:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update member'
    return NextResponse.json(
      { error: '更新會員失敗，請稍後再試' },
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
    console.log('刪除會員:', { id })

    const { data, error } = await insforge.database
      .from(TABLES.MEMBERS)
      .delete()
      .eq('id', id)
      .select()

    if (error) {
      console.error('Database error deleting member:', {
        error,
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        id,
      })
      
      const errorMessage = String(error.message || '')
      const errorCode = String((error as any).code || '')
      
      // 檢查是否為外鍵約束錯誤（會員有簽到記錄）
      if (errorCode === '23503' || 
          errorMessage.includes('foreign key') || 
          errorMessage.includes('constraint') ||
          errorMessage.includes('referenced')) {
        return NextResponse.json(
          { error: '無法刪除：此會員有簽到記錄，請先刪除相關簽到記錄' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: `刪除會員失敗：${errorMessage || '資料庫錯誤'}` },
        { status: 500 }
      )
    }

    console.log('會員刪除成功:', data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error deleting member:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete member'
    // 檢查是否為外鍵約束錯誤（會員有簽到記錄）
    if (errorMessage.includes('foreign key') || errorMessage.includes('constraint')) {
      return NextResponse.json(
        { error: '無法刪除：此會員有簽到記錄，請先刪除相關簽到記錄' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: `刪除會員失敗：${errorMessage}` },
      { status: 500 }
    )
  }
}

