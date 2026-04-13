import { NextResponse } from 'next/server'
import { supabaseService, TABLES } from '@/lib/supabase'
import { apiError, apiSuccess, safeJsonParse } from '@/lib/api-utils'
import { CHECKIN_TIMES } from '@/lib/checkin-times'
import { clearCacheByPrefix } from '@/lib/cache'
import { clearCheckinTimesCache, parseStoredCheckinTimes } from '@/lib/settings-checkin-times'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const SETTINGS_KEY = 'checkin_times'

export type CheckinTimesConfig = {
  meetingRoomOpen: string
  signinStart: string
  lateThreshold: string
  signinDeadline: string
  lotteryCutoff: string
}

const DEFAULT_CONFIG: CheckinTimesConfig = {
  meetingRoomOpen: CHECKIN_TIMES.meetingRoomOpen,
  signinStart: CHECKIN_TIMES.signinStart,
  lateThreshold: CHECKIN_TIMES.lateThreshold,
  signinDeadline: CHECKIN_TIMES.signinDeadline,
  lotteryCutoff: CHECKIN_TIMES.lotteryCutoff,
}

function normalizeHHmm(v: string): string {
  if (!v || typeof v !== 'string') return '06:15'
  const parts = v.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!parts) return '06:15'
  const h = Math.min(23, Math.max(0, parseInt(parts[1], 10)))
  const m = Math.min(59, Math.max(0, parseInt(parts[2], 10)))
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** GET：取得目前簽到時間設定（與後台／簽到／抽獎同步） */
export async function GET() {
  try {
    const { data, error } = await supabaseService
      .from(TABLES.SYSTEM_SETTINGS)
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()

    if (error) {
      console.warn('Settings fetch (checkin_times):', error.message)
      return NextResponse.json({ ...DEFAULT_CONFIG, _source: 'default' })
    }

    const value = data?.value as Record<string, string> | null
    if (!value || typeof value !== 'object') {
      return NextResponse.json({ ...DEFAULT_CONFIG, _source: 'default' })
    }

    const config = parseStoredCheckinTimes(value)
    return NextResponse.json({ ...config, _source: 'database' })
  } catch (e) {
    console.warn('GET checkin-times settings:', e)
    return NextResponse.json({ ...DEFAULT_CONFIG, _source: 'default' })
  }
}

/** POST：儲存簽到時間設定（後台「儲存設定」時呼叫，與會議室開放／簽到／抽獎同步） */
export async function POST(request: Request) {
  try {
    const { data: body, error: parseError } = await safeJsonParse<{
      meetingRoomOpen?: string
      signinStart?: string
      lateThreshold?: string
      signinDeadline?: string
      lotteryCutoff?: string
    }>(request)

    if (parseError || !body) {
      return apiError('請求格式錯誤', 400)
    }

    const value: CheckinTimesConfig = {
      meetingRoomOpen: normalizeHHmm(body.meetingRoomOpen ?? DEFAULT_CONFIG.meetingRoomOpen),
      signinStart: normalizeHHmm(body.signinStart ?? body.meetingRoomOpen ?? DEFAULT_CONFIG.signinStart),
      lateThreshold: normalizeHHmm(body.lateThreshold ?? DEFAULT_CONFIG.lateThreshold),
      signinDeadline: normalizeHHmm(body.signinDeadline ?? DEFAULT_CONFIG.signinDeadline),
      lotteryCutoff: normalizeHHmm(body.lotteryCutoff ?? DEFAULT_CONFIG.lotteryCutoff),
    }

    const { error } = await supabaseService
      .from(TABLES.SYSTEM_SETTINGS)
      .upsert({ key: SETTINGS_KEY, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

    if (error) {
      console.error('POST checkin-times settings:', error)
      const msg = error.message || ''
      if (msg.includes('does not exist') || msg.includes('42P01')) {
        return apiError('請先建立系統設定表：於 Supabase SQL Editor 執行 supabase/migrations/20260212000000_add_system_settings.sql', 500)
      }
      return apiError(`儲存失敗：${error.message}`, 500)
    }

    clearCacheByPrefix('settings:')
    clearCheckinTimesCache()
    return apiSuccess({ message: '已儲存，簽到與抽獎時間已同步' })
  } catch (e) {
    console.error('POST checkin-times settings:', e)
    return apiError('儲存失敗', 500)
  }
}
