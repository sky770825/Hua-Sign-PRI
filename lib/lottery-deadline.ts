/**
 * 抽獎規則（台北時間）：
 * - 例會日（每週四）6:30～7:00：簽到與抽獎同時開放，可隨時抽獎
 * - 例會日 7:00：簽到與抽獎皆鎖定，表單關閉
 * - 隔週四 6:30：名單歸零，新週期開放
 */

const SIGNIN_OPEN_MINS = 6 * 60 + 30
const CUTOFF_MINS = 7 * 60 + 0
const THURSDAY = 4

/**
 * 抽獎是否已關閉（7:00 後或非例會日 6:30～7:00 時段）
 * 僅例會日 6:30～7:00 可抽獎
 */
export function isLotteryClosed(meetingDate: string): boolean {
  const now = new Date()
  const twDateStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  if (twDateStr !== meetingDate) return true
  const twHour = parseInt(now.toLocaleString('en-CA', { timeZone: 'Asia/Taipei', hour: '2-digit', hour12: false }), 10)
  const twMin = parseInt(now.toLocaleString('en-CA', { timeZone: 'Asia/Taipei', minute: '2-digit' }), 10)
  const mins = twHour * 60 + twMin
  return mins < SIGNIN_OPEN_MINS || mins >= CUTOFF_MINS
}

/**
 * 取得例會日對應的抽獎截止時間（隔週四 6:30 台北時間）
 * @param meetingDate YYYY-MM-DD
 */
export function getLotteryDeadline(meetingDate: string): Date {
  const d = new Date(meetingDate + 'T00:00:00+08:00')
  const day = d.getDay()
  let daysToNextThursday = (THURSDAY - day + 7) % 7
  if (daysToNextThursday === 0) daysToNextThursday = 7
  const nextThursday = new Date(d)
  nextThursday.setDate(d.getDate() + daysToNextThursday)
  nextThursday.setHours(6, 30, 0, 0)
  return nextThursday
}

/**
 * 目前台北時間是否已超過該例會的抽獎截止時間
 */
export function isLotteryExpired(meetingDate: string): boolean {
  const deadline = getLotteryDeadline(meetingDate)
  const now = new Date()
  return now >= deadline
}

/**
 * 取得抽獎截止時間的字串描述（供 UI 顯示）
 */
export function getLotteryDeadlineLabel(meetingDate: string): string {
  const deadline = getLotteryDeadline(meetingDate)
  return deadline.toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
