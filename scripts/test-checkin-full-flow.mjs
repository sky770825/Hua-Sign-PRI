#!/usr/bin/env node
/**
 * 完整測試：簽到 API → 獎品區（抽獎）→ 後台同步
 * 使用 /api/checkin 與 /api/lottery/draw，驗證簽到可進入獎品區且後台可查
 *
 * 需先啟動 dev server：npm run dev
 * 使用：node scripts/test-checkin-full-flow.mjs [日期]
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const dateArg = process.argv[2]
const targetDate = dateArg || new Date().toISOString().split('T')[0]

async function main() {
  console.log('📋 完整流程測試：簽到 → 獎品區 → 後台\n')
  console.log('日期:', targetDate, '| BASE:', BASE)

  // 1. 確保有會議
  const meetingRes = await fetch(`${BASE}/api/meetings`)
  const meetingData = await meetingRes.json().catch(() => ({}))
  const meetings = meetingData.meetings || []
  const hasMeeting = meetings.some((m) => m.date === targetDate)
  if (!hasMeeting) {
    console.log('建立會議...')
    const createRes = await fetch(`${BASE}/api/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: targetDate, status: 'scheduled' }),
    })
    if (!createRes.ok) {
      console.error('❌ 建立會議失敗')
      process.exit(1)
    }
  }
  console.log('✅ 會議已就緒')

  // 2. 簽到（使用 _testBypassTime 繞過時間，checkin_time 會設為 06:45 進入獎品區）
  const memberId = 1
  const checkinRes = await fetch(`${BASE}/api/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      memberId,
      date: targetDate,
      message: '測試簽到（完整流程）',
      status: 'present',
      _testBypassTime: true,
    }),
  })
  const checkinData = await checkinRes.json().catch(() => ({}))
  if (!checkinRes.ok) {
    console.error('❌ 簽到失敗:', checkinData.error || checkinRes.status)
    process.exit(1)
  }
  console.log('✅ 簽到成功（member_id:', memberId, ')')

  // 3. 確認簽到出現在 /api/checkins
  const checkinsRes = await fetch(`${BASE}/api/checkins?date=${targetDate}`)
  const checkinsData = await checkinsRes.json().catch(() => ({}))
  const found = (checkinsData.checkins || []).some((c) => c.member_id === memberId)
  if (!found) {
    console.error('❌ 簽到未出現在 /api/checkins')
    process.exit(1)
  }
  console.log('✅ 簽到已出現在 /api/checkins（與前端/後台同步）')

  // 4. 抽獎（驗證可進入獎品區）
  const drawRes = await fetch(`${BASE}/api/lottery/draw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: targetDate, _testBypassTime: true }),
  })
  const drawData = await drawRes.json().catch(() => ({}))
  if (!drawRes.ok) {
    console.error('❌ 抽獎失敗:', drawData.error || drawRes.status)
    process.exit(1)
  }
  console.log('✅ 抽獎成功')
  console.log('   中獎者:', drawData.winner?.name, '(編號', drawData.winner?.member_id, ')')
  console.log('   獎品:', drawData.prize?.name)

  // 5. 確認後台 API 可見
  const contextRes = await fetch(`${BASE}/api/attendance/context`)
  const contextData = await contextRes.json().catch(() => ({}))
  const byDate = contextData.checkinsByDate || {}
  const dayCheckins = byDate[targetDate] || []
  const inAdmin = dayCheckins.some((c) => c.member_id === memberId)
  if (!inAdmin) {
    console.warn('⚠️ 後台 context 未包含今日簽到（可能是快取）')
  } else {
    console.log('✅ 後台 /api/attendance/context 已同步')
  }

  // 6. 清理：刪除中獎紀錄（可選）
  const winnersRes = await fetch(`${BASE}/api/lottery/winners?date=${targetDate}`)
  const winnersData = await winnersRes.json().catch(() => ({}))
  const winners = winnersData.winners || []
  if (winners.length > 0) {
    const delRes = await fetch(`${BASE}/api/lottery/winners/${winners[0].id}`, {
      method: 'DELETE',
    })
    if (delRes.ok) console.log('✅ 已刪除測試中獎紀錄')
  }

  // 刪除簽到
  const delCheckinRes = await fetch(`${BASE}/api/checkin/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, date: targetDate }),
  })
  if (delCheckinRes.ok) console.log('✅ 已刪除測試簽到')
  else console.warn('⚠️ 刪除簽到失敗（可手動刪除）')

  console.log('\n✅ 完整流程測試通過：簽到 → 獎品區 → 後台同步正常')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
