#!/usr/bin/env node
/**
 * 測試抽獎：轉 10 次，確認獎品與中獎者無誤，再刪除該 10 筆中獎紀錄。
 * 使用方式：
 *   node scripts/test-lottery-10-draws.mjs           # 使用今天
 *   node scripts/test-lottery-10-draws.mjs 2026-01-15 # 指定日期
 * 需先啟動 dev server：npm run dev
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const dateArg = process.argv[2]
let targetDate = dateArg || new Date().toISOString().split('T')[0]

async function findDateWithCheckins() {
  const res = await fetch(`${BASE}/api/meetings`)
  const data = await res.json().catch(() => ({}))
  const meetings = (data.meetings || []).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  for (const m of meetings) {
    const cr = await fetch(`${BASE}/api/checkins?date=${m.date}`)
    const cd = await cr.json().catch(() => ({}))
    const count = (cd.checkins || []).length
    if (count > 0) return m.date
  }
  return null
}

async function draw(date) {
  const d = date || targetDate
  const res = await fetch(`${BASE}/api/lottery/draw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: d }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `抽獎失敗 ${res.status}`)
  return data
}

async function getWinners(date) {
  const d = date || targetDate
  const res = await fetch(`${BASE}/api/lottery/winners?date=${d}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `取得中獎名單失敗 ${res.status}`)
  return data.winners || []
}

async function deleteWinner(id) {
  const res = await fetch(`${BASE}/api/lottery/winners/${id}`, { method: 'DELETE' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `刪除失敗 ${res.status}`)
  return data
}

async function main() {
  if (!dateArg) {
    const found = await findDateWithCheckins()
    if (found) {
      targetDate = found
      console.log('今天無簽到，改用有簽到的會議日期:', targetDate)
    }
  }
  console.log('日期:', targetDate, '| BASE:', BASE)
  console.log('--- 開始抽獎 10 次 ---\n')

  const results = []
  for (let i = 1; i <= 10; i++) {
    try {
      const data = await draw(targetDate)
      const prize = data.prize || {}
      const winner = data.winner || {}
      results.push({
        round: i,
        winner_id: winner.member_id,
        winner_name: winner.name,
        prize_id: prize.id,
        prize_name: prize.name,
        record_id: data.winner_record_id,
      })
      console.log(
        `第 ${i} 次: 獎品「${prize.name}」 → 中獎者 ${winner.name} (編號 ${winner.member_id})`
      )
    } catch (e) {
      console.error(`第 ${i} 次 抽獎失敗:`, e.message)
      process.exit(1)
    }
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log('\n--- 確認中獎名單（API） ---')
  const winners = await getWinners(targetDate)
  console.log('共', winners.length, '筆中獎紀錄')
  if (winners.length !== 10) {
    console.warn('預期 10 筆，實際', winners.length, '筆')
  }
  winners.forEach((w, i) => {
    console.log(
      `  ${i + 1}. ID=${w.id}  ${w.member_name} → ${w.prize_name}`
    )
  })

  console.log('\n--- 刪除上述 10 筆中獎紀錄 ---')
  const idsToDelete = winners.map((w) => w.id)
  for (const id of idsToDelete) {
    await deleteWinner(id)
    console.log('  已刪除紀錄 ID:', id)
    await new Promise((r) => setTimeout(r, 150))
  }

  const after = await getWinners(targetDate)
  console.log('\n刪除後中獎名單筆數:', after.length)
  if (after.length > 0) {
    console.warn('仍有未刪除紀錄:', after.map((w) => w.id))
  } else {
    console.log('✅ 10 次抽獎測試完成，中獎紀錄已全部刪除。')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
