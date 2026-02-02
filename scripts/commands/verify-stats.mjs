/**
 * 驗證統計 API 回傳格式與數值
 */
export const help = 'verify stats [baseUrl]      驗證 /api/statistics/member-attendance'

/**
 * @param {string} [base] - 例如 http://localhost:3000
 */
export async function run(base) {
  const BASE = base || process.env.BASE_URL || 'http://localhost:3000'
  console.log('📊 驗證 /api/statistics/member-attendance\n')
  console.log('BASE:', BASE)

  const res = await fetch(`${BASE}/api/statistics/member-attendance`)
  const body = await res.json().catch(() => ({}))

  console.log('\n1️⃣ 回應狀態:', res.status)
  console.log('2️⃣ success:', body.success)
  if (body.success && body.data) {
    const d = body.data
    console.log('   data keys:', Object.keys(d))
    console.log('   totalMeetings:', d.totalMeetings)
    console.log('   memberStats 類型:', Array.isArray(d.memberStats) ? 'array' : typeof d.memberStats)
  } else {
    console.log('   error:', body.error || body)
  }
  console.log('')
}
