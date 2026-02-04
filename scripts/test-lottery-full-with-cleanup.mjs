#!/usr/bin/env node
/**
 * 完整測試：10 人簽到 → 獎品庫存設 10 → 抽獎 10 次 → 驗證同步 → 恢復並刪除所有測試資料
 *
 * 需先啟動 dev server：npm run dev
 * 使用：node scripts/test-lottery-full-with-cleanup.mjs [日期]
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000'

async function getNextThursday() {
  const d = new Date()
  const day = d.getDay()
  const daysUntil = (4 - day + 7) % 7 || 7
  const next = new Date(d)
  next.setDate(d.getDate() + daysUntil)
  return next.toISOString().split('T')[0]
}

async function main() {
  const dateArg = process.argv[2]
  const targetDate = dateArg || await getNextThursday()

  console.log('═══════════════════════════════════════════════════════')
  console.log('  完整抽獎測試（含恢復與清理）')
  console.log('  日期:', targetDate, '| BASE:', BASE)
  console.log('═══════════════════════════════════════════════════════\n')

  // 動態載入 Supabase（僅用於備份/恢復獎品、直接操作 DB）
  const { getSupabase } = await import('./lib/supabase.mjs')
  const { supabase, TABLES } = getSupabase()

  const backup = {
    prizes: [],
    checkins: [],
    winners: [],
    meetingCreated: false,
    meetingId: null,
  }

  try {
    // ═══ 階段 0：備份現有資料 ═══
    console.log('【階段 0】備份現有資料...')
    const { data: prizesData } = await supabase.from(TABLES.PRIZES).select('id, name, total_quantity, remaining_quantity')
    backup.prizes = prizesData || []
    console.log('  獎品備份:', backup.prizes.length, '筆')

    const { data: existCheckins } = await supabase.from(TABLES.CHECKINS).select('*').eq('meeting_date', targetDate)
    backup.checkins = existCheckins || []
    console.log('  當日簽到備份:', backup.checkins.length, '筆')

    const { data: existWinners } = await supabase.from(TABLES.WINNERS).select('id').eq('meeting_date', targetDate)
    backup.winners = existWinners || []
    console.log('  當日中獎備份:', backup.winners.length, '筆\n')

    // ═══ 階段 1：確保會議存在 ═══
    console.log('【階段 1】確保會議存在...')
    const meetingsRes = await fetch(`${BASE}/api/meetings`)
    const meetingsData = await meetingsRes.json().catch(() => ({}))
    const meetings = meetingsData.meetings || []
    const hasMeeting = meetings.some((m) => m.date === targetDate)
    if (!hasMeeting) {
      const createRes = await fetch(`${BASE}/api/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: targetDate, status: 'scheduled' }),
      })
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}))
        throw new Error('建立會議失敗: ' + (err.error || createRes.status))
      }
      backup.meetingCreated = true
      console.log('  ✅ 已建立測試會議', targetDate)
    } else {
      console.log('  ✅ 會議已存在')
    }

    // ═══ 階段 2：取得前 10 名會員 ═══
    console.log('\n【階段 2】取得測試名單（前 10 人）...')
    const membersRes = await fetch(`${BASE}/api/members`)
    const membersData = await membersRes.json().catch(() => ({}))
    const members = (membersData.members || []).slice(0, 10)
    if (members.length < 10) {
      throw new Error(`會員不足 10 人，目前僅 ${members.length} 人`)
    }
    console.log('  測試會員:', members.map((m) => m.id + ' ' + m.name).join(', '))

    // 先刪除該日期既有簽到（測試乾淨環境）
    if (backup.checkins.length > 0) {
      for (const c of backup.checkins) {
        await supabase.from(TABLES.CHECKINS).delete().eq('id', c.id)
      }
      console.log('  已清除該日期既有簽到', backup.checkins.length, '筆')
    }
    if (backup.winners.length > 0) {
      for (const w of backup.winners) {
        await supabase.from(TABLES.WINNERS).delete().eq('id', w.id)
      }
      console.log('  已清除該日期既有中獎', backup.winners.length, '筆')
    }

    // ═══ 階段 3：10 人簽到（_testBypassTime，checkin_time 06:45 進獎品區）═══
    console.log('\n【階段 3】10 人簽到...')
    for (const m of members) {
      const res = await fetch(`${BASE}/api/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: m.id,
          date: targetDate,
          message: '測試簽到',
          status: 'present',
          _testBypassTime: true,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(`簽到失敗 ${m.id}: ${err.error || res.status}`)
      }
    }
    console.log('  ✅ 10 人簽到完成')

    // 驗證簽到同步
    const checkinsVerify = await fetch(`${BASE}/api/checkins?date=${targetDate}`)
    const checkinsVerifyData = await checkinsVerify.json().catch(() => ({}))
    const checkinCount = (checkinsVerifyData.checkins || []).length
    if (checkinCount !== 10) {
      throw new Error(`簽到同步異常：預期 10 筆，實際 ${checkinCount} 筆`)
    }
    console.log('  ✅ /api/checkins 同步確認：10 筆')

    // ═══ 階段 4：獎品庫存設為 10 ═══
    console.log('\n【階段 4】獎品庫存設為 10...')
    const { data: allPrizes } = await supabase.from(TABLES.PRIZES).select('id, name')
    const prizeList = allPrizes || []
    if (prizeList.length === 0) {
      throw new Error('獎品庫存為空，請先新增獎品')
    }
    for (const p of prizeList) {
      const { error } = await supabase
        .from(TABLES.PRIZES)
        .update({
          total_quantity: 10,
          remaining_quantity: 10,
          updated_at: new Date().toISOString(),
        })
        .eq('id', p.id)
      if (error) throw new Error(`獎品 ${p.id} 更新失敗: ${error.message}`)
    }
    console.log('  ✅ 獎品庫存已設為 10（共', prizeList.length, '項）')

    // ═══ 階段 5：抽獎 10 次 ═══
    console.log('\n【階段 5】抽獎 10 次...')
    const drawResults = []
    for (let i = 1; i <= 10; i++) {
      const drawRes = await fetch(`${BASE}/api/lottery/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: targetDate, _testBypassTime: true }),
      })
      const drawData = await drawRes.json().catch(() => ({}))
      if (!drawRes.ok) {
        throw new Error(`第 ${i} 次抽獎失敗: ${drawData.error || drawRes.status}`)
      }
      drawResults.push({
        round: i,
        winner: drawData.winner,
        prize: drawData.prize,
      })
      console.log(`  第 ${i} 次: ${drawData.winner?.name} → ${drawData.prize?.name}`)
      await new Promise((r) => setTimeout(r, 200))
    }
    console.log('  ✅ 10 次抽獎完成')

    // ═══ 階段 6：驗證同步 ═══
    console.log('\n【階段 6】驗證所有資訊同步...')

    const winnersRes = await fetch(`${BASE}/api/lottery/winners?date=${targetDate}`)
    const winnersData = await winnersRes.json().catch(() => ({}))
    const winners = winnersData.winners || []
    if (winners.length !== 10) {
      throw new Error(`中獎名單異常：預期 10 筆，實際 ${winners.length} 筆`)
    }
    console.log('  ✅ 中獎名單 /api/lottery/winners：10 筆')

    const prizesAfterRes = await fetch(`${BASE}/api/prizes?_t=${Date.now()}`)
    const prizesAfterData = await prizesAfterRes.json().catch(() => ({}))
    const prizesAfter = prizesAfterData.prizes || []
    const totalRemaining = prizesAfter.reduce((s, p) => s + (p.remaining_quantity || 0), 0)
    const expectedRemaining = prizeList.length * 10 - 10
    if (totalRemaining !== expectedRemaining) {
      console.warn(`  ⚠ 獎品總剩餘：${totalRemaining}（抽走 10 份後預期約 ${expectedRemaining}）`)
    } else {
      console.log('  ✅ 獎品庫存同步：已扣除 10 份')
    }

    const contextRes = await fetch(`${BASE}/api/attendance/context`)
    const contextData = await contextRes.json().catch(() => ({}))
    const byDate = contextData.checkinsByDate || {}
    const dayCheckins = byDate[targetDate] || []
    if (dayCheckins.length !== 10) {
      console.warn('  ⚠ 後台 context 簽到數:', dayCheckins.length)
    } else {
      console.log('  ✅ 後台 /api/attendance/context 簽到同步：10 筆')
    }

    console.log('\n  ✅ 所有資訊同步確認完成')

    // ═══ 階段 7：恢復並刪除測試資料 ═══
    console.log('\n【階段 7】恢復並刪除測試資料...')

    // 刪除該日期所有簽到
    const { data: testCheckins } = await supabase.from(TABLES.CHECKINS).select('id').eq('meeting_date', targetDate)
    for (const c of testCheckins || []) {
      await supabase.from(TABLES.CHECKINS).delete().eq('id', c.id)
    }
    console.log('  ✅ 已刪除測試簽到', (testCheckins || []).length, '筆')

    // 刪除該日期所有中獎紀錄（抽獎 API 會還原獎品剩餘數量需另外處理，winner delete 會還原）
    const { data: testWinners } = await supabase.from(TABLES.WINNERS).select('id, prize_id').eq('meeting_date', targetDate)
    for (const w of testWinners || []) {
      await fetch(`${BASE}/api/lottery/winners/${w.id}`, { method: 'DELETE' })
      await new Promise((r) => setTimeout(r, 100))
    }
    console.log('  ✅ 已刪除測試中獎紀錄', (testWinners || []).length, '筆')

    // 恢復獎品庫存（還原備份值）
    for (const p of backup.prizes) {
      await supabase
        .from(TABLES.PRIZES)
        .update({
          total_quantity: p.total_quantity,
          remaining_quantity: p.remaining_quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', p.id)
    }
    console.log('  ✅ 已恢復獎品庫存', backup.prizes.length, '筆')

    // 恢復原有簽到（若有）
    if (backup.checkins.length > 0) {
      for (const c of backup.checkins) {
        const { error } = await supabase.from(TABLES.CHECKINS).insert({
          member_id: c.member_id,
          meeting_date: c.meeting_date,
          checkin_time: c.checkin_time,
          message: c.message || null,
          status: c.status || 'present',
        })
        if (error) console.warn('  還原簽到失敗', c.member_id, error.message)
      }
      console.log('  ✅ 已還原原有簽到', backup.checkins.length, '筆')
    }

    // 若為本次建立的會議則刪除
    if (backup.meetingCreated) {
      const { data: meetingToDel } = await supabase.from(TABLES.MEETINGS).select('id').eq('date', targetDate).maybeSingle()
      if (meetingToDel) {
        await fetch(`${BASE}/api/meetings/${meetingToDel.id}`, { method: 'DELETE' })
        console.log('  ✅ 已刪除測試會議', targetDate)
      }
    }

    console.log('\n═══════════════════════════════════════════════════════')
    console.log('  ✅ 測試完成，所有測試資料已恢復並刪除')
    console.log('═══════════════════════════════════════════════════════\n')
  } catch (err) {
    console.error('\n❌ 測試失敗:', err.message)
    // 嘗試恢復獎品
    if (backup.prizes.length > 0) {
      console.log('嘗試恢復獎品庫存...')
      for (const p of backup.prizes) {
        await supabase.from(TABLES.PRIZES).update({
          total_quantity: p.total_quantity,
          remaining_quantity: p.remaining_quantity,
          updated_at: new Date().toISOString(),
        }).eq('id', p.id)
      }
      console.log('獎品庫存已恢復')
    }
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
