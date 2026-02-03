#!/usr/bin/env node
/**
 * 檢查簽到記錄是否有多餘重複（同一 member_id + meeting_date 多筆）
 * 使用方式：node scripts/check-duplicate-checkins.mjs
 * 需設定 .env.local 的 Supabase 變數
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('請設定 .env.local 中的 NEXT_PUBLIC_SUPABASE_URL 與 SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)
const TABLE = 'estate_attendance_checkins'

async function main() {
  const PAGE = 1000
  let all = []
  let offset = 0
  let hasMore = true
  while (hasMore) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, member_id, meeting_date')
      .order('meeting_date', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) {
      console.error('查詢失敗:', error.message)
      process.exit(1)
    }
    all = all.concat(data || [])
    hasMore = (data || []).length >= PAGE
    offset += PAGE
  }

  const keyCount = new Map()
  for (const row of all) {
    const k = `${row.member_id}-${row.meeting_date}`
    keyCount.set(k, (keyCount.get(k) || 0) + 1)
  }

  const duplicates = [...keyCount.entries()].filter(([, c]) => c > 1)
  if (duplicates.length === 0) {
    console.log('✅ 無重複紀錄：每個 (member_id, meeting_date) 皆唯一')
    console.log(`總簽到筆數: ${all.length}`)
    return
  }

  console.log(`⚠️ 發現 ${duplicates.length} 組重複 (member_id, meeting_date):`)
  const byDate = new Map()
  for (const [k, count] of duplicates) {
    const [mid, date] = k.split('-', 2)
    const d = k.replace(/^\d+-/, '').slice(0, 7)
    if (!byDate.has(d)) byDate.set(d, 0)
    byDate.set(d, byDate.get(d) + (count - 1))
  }
  console.log('依月份多算的筆數（重複導致的多計）:')
  for (const [ym, extra] of [...byDate.entries()].sort()) {
    console.log(`  ${ym}: 多計 ${extra} 筆`)
  }
  console.log('\n建議：執行 SQL 刪除重複，僅保留每組 (member_id, meeting_date) 最新一筆')
}

main().catch(console.error)
