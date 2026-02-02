import { NextResponse } from 'next/server'
import { supabaseService, TABLES } from '@/lib/supabase'
import { apiError, handleDatabaseError, ensureSupabaseConfigured } from '@/lib/api-utils'
import { withCache, CacheKeys, CacheConfig } from '@/lib/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  const envErr = ensureSupabaseConfigured()
  if (envErr) return envErr
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
    const err = error instanceof Error ? error : new Error(String(error))
    // 常見 Supabase 錯誤給予較明確提示
    let hint = ''
    if (err.message.includes('Invalid API key') || err.message.includes('JWT')) {
      hint = '請確認 SUPABASE_SERVICE_KEY 為正確的 service_role JWT，不是 sbp_ 開頭的 CLI token'
    } else if (err.message.includes('fetch') || err.message.includes('ECONNREFUSED')) {
      hint = '無法連線 Supabase，請確認專案未暫停且環境變數正確'
    }
    return apiError(
      hint ? `查詢會員失敗：${err.message}。${hint}` : `查詢會員失敗：${err.message}`,
      500
    )
  }
}

