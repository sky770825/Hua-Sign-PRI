#!/usr/bin/env node
/**
 * 驗證統計 API 回傳格式與數值
 * 使用：node scripts/verify-stats-api.mjs [BASE_URL]
 */

const BASE = process.argv[2] || process.env.BASE_URL || 'http://localhost:3000'

async function main() {
  console.log('📊 驗證 /api/statistics/member-attendance\n')
  console.log('BASE:', BASE)

  const res = await fetch(`${BASE}/api/statistics/member-attendance`)
  const body = await res.json().catch(() => ({}))

  console.log('\n1️⃣ 回應狀態:', res.status)
  console.log('2️⃣ success:', body.success)
  console.log('3️⃣ 回應結構 keys:', body.success ? Object.keys(body) : [])

  if (body.success && body.data) {
    const d = body.data
    console.log('   data keys:', Object.keys(d))
    console.log('   totalMeetings:', d.totalMeetings)
    console.log('   memberStats 類型:', Array.isArray(d.memberStats) ? 'array' : typeof d.memberStats)
    if (typeof d.memberStats === 'object' && d.memberStats !== null && !Array.isArray(d.memberStats)) {
      const ids = Object.keys(d.memberStats).slice(0, 5)
      console.log('   memberStats 前幾筆 key:', ids)
      const first = d.memberStats[ids[0]]
      if (first) console.log('   單筆結構:', Object.keys(first), first)
    }
    if (Array.isArray(d.data)) {
      console.log('   data (陣列) 筆數:', d.data.length)
      const first = d.data[0]
      if (first) console.log('   陣列第一筆:', first)
    }
    // 抽查：總會議數應與每人 stat.total 一致
    if (d.memberStats && typeof d.memberStats === 'object') {
      const vals = Object.values(d.memberStats)
      const totals = [...new Set(vals.map(v => v.total))]
      console.log('\n4️⃣ 每人 stat.total 是否一致:', totals.length === 1 ? `是 (${totals[0]})` : `否，有 ${totals.length} 種值: ${totals.join(', ')}`)
    }
  } else {
    console.log('   error:', body.error || body)
  }
  console.log('')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
