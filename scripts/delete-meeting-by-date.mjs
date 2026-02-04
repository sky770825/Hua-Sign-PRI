#!/usr/bin/env node
/**
 * 刪除指定日期的會議及相關簽到、抽獎記錄
 * 使用：node scripts/delete-meeting-by-date.mjs 2026-02-04
 */
import { getSupabase } from './lib/supabase.mjs'

const date = process.argv[2]
if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('用法: node scripts/delete-meeting-by-date.mjs YYYY-MM-DD')
  console.error('範例: node scripts/delete-meeting-by-date.mjs 2026-02-04')
  process.exit(1)
}

const { supabase, TABLES } = getSupabase()
console.log(`🗑️  刪除 ${date} 的會議及相關資料...`)

const { data: meeting, error: meetErr } = await supabase
  .from(TABLES.MEETINGS)
  .select('id, date')
  .eq('date', date)
  .maybeSingle()

if (meetErr) {
  console.error('❌ 查詢會議失敗:', meetErr.message)
  process.exit(1)
}

if (!meeting) {
  console.log('⚠️  該日期沒有會議記錄，無須刪除')
  process.exit(0)
}

// 刪除簽到
const { data: delCheckins } = await supabase.from(TABLES.CHECKINS).delete().eq('meeting_date', date).select('id')
console.log(`✅ 簽到記錄：已刪除 ${delCheckins?.length ?? 0} 筆`)

// 刪除抽獎
const { data: delWinners } = await supabase.from(TABLES.WINNERS).delete().eq('meeting_date', date).select('id')
console.log(`✅ 抽獎記錄：已刪除 ${delWinners?.length ?? 0} 筆`)

// 刪除會議
const { error: delMeetErr } = await supabase.from(TABLES.MEETINGS).delete().eq('id', meeting.id)
if (delMeetErr) {
  console.error('❌ 刪除會議失敗:', delMeetErr.message)
  process.exit(1)
}
console.log(`✅ 會議 ${date} 已刪除`)
console.log('\n✅ 完成！')
