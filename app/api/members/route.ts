import { NextResponse } from 'next/server'
import { supabaseService, TABLES } from '@/lib/supabase'
import { apiError, handleDatabaseError } from '@/lib/api-utils'
import { withCache, CacheKeys, CacheConfig } from '@/lib/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  try {
    const members = await withCache(
      CacheKeys.MEMBERS,
      async () => {
        const { data, error } = await supabaseService
          .from(TABLES.MEMBERS)
          .select('id, name, profession')
          .order('id', { ascending: true })

        if (error) {
          console.error('Error fetching members:', error)
          throw new Error(`查詢會員失敗：${handleDatabaseError(error)}`)
        }

        return data || []
      },
      CacheConfig.MEMBERS_TTL
    )

    return NextResponse.json(
      { members },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching members:', error)
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return apiError(`查詢會員失敗：${errorMessage}`, 500)
  }
}

