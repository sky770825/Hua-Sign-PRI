#!/usr/bin/env node
/**
 * 測試流程：新增 10 個簽到人 → 抽獎一次 → 刪除測試簽到
 * 使用方式：
 *   node scripts/test-add-10-checkins-draw-delete.mjs           # 使用今天
 *   node scripts/test-add-10-checkins-draw-delete.mjs 2026-02-06  # 指定日期
 * 需先啟動 dev server：npm run dev
 */

import { getSupabase } from './lib/supabase.mjs'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const dateArg = process.argv[2]
const targetDate = dateArg || new Date().toISOString().split('T')[0]

async function main() {
  console.log('📋 測試流程：新增 10 人簽到 → 抽獎 → 刪除測試簽到\n')
  console.log('日期:', targetDate, '| BASE:', BASE)

  const { supabase, TABLES } = getSupabase()

  // 1. 確保有會議
  const { error: meetingErr } = await supabase
    .from(TABLES.MEETINGS)
    .upsert({ date: targetDate, status: 'scheduled' }, { onConflict: 'date' })
  if (meetingErr) {
    console.error('❌ 建立會議失敗:', meetingErr.message)
    process.exit(1)
  }
  console.log('✅ 會議日期已就緒')

  // 2. 取得前 10 個會員
  const { data: members, error: membersErr } = await supabase
    .from(TABLES.MEMBERS)
    .select('id')
    .order('id', { ascending: true })
    .limit(10)
  if (membersErr || !members || members.length < 10) {
    console.error('❌ 會員不足 10 人，目前:', members?.length ?? 0)
    process.exit(1)
  }
  const memberIds = members.map((m) => m.id)
  console.log('✅ 使用會員編號:', memberIds.join(', '))

  // 3. 檢查並插入 10 筆簽到（7:00 前簽到，進入獎品區）
  const checkinTime = `${targetDate}T06:45:00+08:00`
  const toInsert = memberIds.map((member_id) => ({
    member_id,
    meeting_date: targetDate,
    checkin_time: checkinTime,
    message: '測試簽到（將於測試結束後刪除）',
    status: 'present',
  }))

  const inserted = []
  for (const rec of toInsert) {
    const { data: existing } = await supabase
      .from(TABLES.CHECKINS)
      .select('id')
      .eq('member_id', rec.member_id)
      .eq('meeting_date', rec.meeting_date)
      .maybeSingle()
    if (existing) {
      console.log('  會員', rec.member_id, '已有簽到，跳過')
      inserted.push(rec.member_id)
      continue
    }
    const { error: insErr } = await supabase.from(TABLES.CHECKINS).insert(rec)
    if (insErr) {
      console.error('❌ 簽到插入失敗:', rec.member_id, insErr.message)
      process.exit(1)
    }
    inserted.push(rec.member_id)
  }
  console.log('✅ 已新增', inserted.length, '筆簽到')

  // 4. 抽獎（開發環境使用 _testBypassTime 繞過時間限制）
  console.log('\n--- 執行抽獎 ---')
  const drawRes = await fetch(`${BASE}/api/lottery/draw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: targetDate, _testBypassTime: true }),
  })
  const drawData = await drawRes.json().catch(() => ({}))
  if (!drawRes.ok) {
    console.error('❌ 抽獎失敗:', drawData.error || drawRes.status)
    console.log('提示：若在正式環境請於例會日 6:30～7:00 測試，或確認 dev server 已啟動')
    await deleteCheckins(supabase, TABLES, memberIds, targetDate)
    process.exit(1)
  }
  const prize = drawData.prize || {}
  const winner = drawData.winner || {}
  console.log('🎉 中獎者:', winner.name, '(編號', winner.member_id, ')')
  console.log('🎁 獎品:', prize.name)
  console.log('   會員中獎機率:', drawData.winnerProbability)
  console.log('   獎品中獎機率:', drawData.prizeProbability)

  // 5. 刪除測試簽到
  console.log('\n--- 刪除測試簽到 ---')
  await deleteCheckins(supabase, TABLES, memberIds, targetDate)
  console.log('✅ 測試完成，已刪除', memberIds.length, '筆測試簽到')
}

async function deleteCheckins(supabase, TABLES, memberIds, date) {
  for (const memberId of memberIds) {
    const { error } = await supabase
      .from(TABLES.CHECKINS)
      .delete()
      .eq('member_id', memberId)
      .eq('meeting_date', date)
    if (error) {
      console.warn('  刪除簽到失敗:', memberId, error.message)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
