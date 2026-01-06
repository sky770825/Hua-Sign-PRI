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

    const { error } = await insforge.database
      .from(TABLES.MEMBERS)
      .update({
        name,
        profession: profession || null,
      })
      .eq('id', id)

    if (error) {
      console.error('Database error updating member:', error)
      throw error
    }

    return NextResponse.json({ success: true })
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

    const { error } = await insforge.database
      .from(TABLES.MEMBERS)
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error deleting member:', error)
      throw error
    }

    return NextResponse.json({ success: true })
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
      { error: '刪除會員失敗，請稍後再試' },
      { status: 500 }
    )
  }
}

