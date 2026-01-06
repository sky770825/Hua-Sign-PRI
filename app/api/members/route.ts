import { NextResponse } from 'next/server'
import { insforge, TABLES } from '@/lib/insforge'
import { apiError, handleDatabaseError } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

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

    return NextResponse.json(
      { members: members || [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching members:', error)
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return apiError(`查詢會員失敗：${errorMessage}`, 500)
  }
}

