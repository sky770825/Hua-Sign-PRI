/**
 * Supabase 客戶端（供 CLI / 腳本共用）
 * 使用前需先 loadEnv() 或確保 process.env 已設定
 */
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './env.mjs'
import { projectRoot } from './path.mjs'

export const TABLES = {
  MEMBERS: 'estate_attendance_members',
  MEETINGS: 'estate_attendance_meetings',
  CHECKINS: 'estate_attendance_checkins',
  PRIZES: 'estate_attendance_prizes',
  WINNERS: 'estate_attendance_lottery_winners',
}

/**
 * 載入 env 並建立 Supabase 客戶端
 * @param {string} [root] - 專案根目錄，預設 projectRoot
 * @returns {{ supabase: import('@supabase/supabase-js').SupabaseClient, TABLES: typeof TABLES }}
 */
export function getSupabase(root = projectRoot) {
  loadEnv(root)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sqgrnowrcvspxhuudrqc.supabase.co'
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error('請設定 SUPABASE_SERVICE_KEY 或 NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return { supabase: createClient(url, key), TABLES }
}
