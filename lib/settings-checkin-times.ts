/**
 * 伺服器端：取得可同步的簽到時間設定（來自 DB，與後台系統設定一致）
 * 供 API 簽到／抽獎時間判斷使用
 */
import { supabaseService, TABLES } from '@/lib/supabase'
import { CHECKIN_TIMES } from '@/lib/checkin-times'
import { withCache, clearCacheByPrefix } from '@/lib/cache'

const SETTINGS_KEY = 'checkin_times'
const CACHE_KEY = 'settings:checkin_times'
const CACHE_TTL = 60 * 1000 // 1 分鐘

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

/**
 * 將 DB 內 JSON 轉成與 POST 儲存邏輯一致的設定。
 * 若舊資料只有 meetingRoomOpen 沒有 signinStart，簽到開始應等同會議室開放（與後台「儲存設定」行為一致）。
 */
export function parseStoredCheckinTimes(
  value: Record<string, string> | null | undefined
): CheckinTimesConfig {
  if (!value || typeof value !== 'object') {
    return DEFAULT_CONFIG
  }
  const meetingRoomOpen = normalizeHHmm(value.meetingRoomOpen ?? DEFAULT_CONFIG.meetingRoomOpen)
  const signinStart = normalizeHHmm(
    value.signinStart ?? value.meetingRoomOpen ?? DEFAULT_CONFIG.signinStart
  )
  return {
    meetingRoomOpen,
    signinStart,
    lateThreshold: normalizeHHmm(value.lateThreshold ?? DEFAULT_CONFIG.lateThreshold),
    signinDeadline: normalizeHHmm(value.signinDeadline ?? DEFAULT_CONFIG.signinDeadline),
    lotteryCutoff: normalizeHHmm(value.lotteryCutoff ?? DEFAULT_CONFIG.lotteryCutoff),
  }
}

/** 伺服器端取得目前簽到時間設定（有快取，與後台儲存同步） */
export async function getCheckinTimesConfig(): Promise<CheckinTimesConfig> {
  const config = await withCache(
    CACHE_KEY,
    async () => {
      try {
        const { data, error } = await supabaseService
          .from(TABLES.SYSTEM_SETTINGS)
          .select('value')
          .eq('key', SETTINGS_KEY)
          .maybeSingle()

        if (error || !data?.value || typeof data.value !== 'object') {
          return DEFAULT_CONFIG
        }

        return parseStoredCheckinTimes(data.value as Record<string, string>)
      } catch {
        return DEFAULT_CONFIG
      }
    },
    CACHE_TTL
  )
  return config
}

/** 儲存後清除快取，讓下次請求讀到最新設定 */
export function clearCheckinTimesCache(): void {
  clearCacheByPrefix('settings:')
}
