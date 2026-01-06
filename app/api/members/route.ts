import { NextResponse } from 'next/server'
import { insforge, TABLES } from '@/lib/insforge'
import { apiError, handleDatabaseError } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data: members, error } = await insforge.database
      .from(TABLES.MEMBERS)
      .select('id, name, profession')
      .order('id', { ascending: true })

    if (error) {
      console.error('Error fetching members:', error)
      return apiError(`查詢會員失敗：${handleDatabaseError(error)}`, 500)
    }

    return NextResponse.json({ members: members || [] })
  } catch (error) {
    console.error('Error fetching members:', error)
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return apiError(`查詢會員失敗：${errorMessage}`, 500)
  }
}

