/**
 * 統一簽到時間設定（台北時間）
 * 會議室開放、簽到時段、遲到門檻、獎品區截止 - 全部由此調整
 */
export const CHECKIN_TIMES = {
  /** 會議室／簽到開放時間（HH:mm） */
  meetingRoomOpen: '06:30',
  /** 簽到開始（與會議室同步） */
  signinStart: '06:30',
  /** 超過此時間算遲到（HH:mm） */
  lateThreshold: '07:00',
  /** 簽到截止（HH:mm），此時間後無法簽到 */
  signinDeadline: '08:45',
  /** 獎品區截止：此時間前簽到才能參加抽獎（HH:mm） */
  lotteryCutoff: '07:00',
} as const

function parseTimeToMins(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export const SIGNIN_OPEN_MINS = parseTimeToMins(CHECKIN_TIMES.signinStart)
export const SIGNIN_DEADLINE_MINS = parseTimeToMins(CHECKIN_TIMES.signinDeadline)
export const LATE_THRESHOLD_MINS = parseTimeToMins(CHECKIN_TIMES.lateThreshold)
export const LOTTERY_CUTOFF_MINS = parseTimeToMins(CHECKIN_TIMES.lotteryCutoff)

/**
 * 取得今日台北日期（YYYY-MM-DD）
 */
export function getTodayTaipei(): string {
  const now = new Date()
  return now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

/**
 * 該日期在台北時區是否為週四（例會日）
 */
export function isThursdayInTaipei(dateStr: string): boolean {
  return new Date(dateStr + 'T12:00:00+08:00').getDay() === 4
}

/**
 * 取得目前台北時間的總分鐘數（當日 0:00 起算）
 */
function getNowMinsTaipei(): { mins: number; dateStr: string } {
  const now = new Date()
  const twHour = parseInt(now.toLocaleString('en-CA', { timeZone: 'Asia/Taipei', hour: '2-digit', hour12: false }), 10)
  const twMin = parseInt(now.toLocaleString('en-CA', { timeZone: 'Asia/Taipei', minute: '2-digit' }), 10)
  const dateStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  return { mins: twHour * 60 + twMin, dateStr }
}

/**
 * 簽到是否已截止（超過 signinDeadline）
 */
export function isSigninClosed(meetingDate: string): boolean {
  const { mins, dateStr } = getNowMinsTaipei()
  if (dateStr !== meetingDate) return true
  return mins > SIGNIN_DEADLINE_MINS
}

/**
 * 簽到是否尚未開放（未達 meetingRoomOpen）
 */
export function isSigninNotYetOpen(meetingDate: string): boolean {
  const { mins, dateStr } = getNowMinsTaipei()
  if (dateStr !== meetingDate) return true
  return mins < SIGNIN_OPEN_MINS
}

/**
 * 是否在可簽到時段內（會議室開放～簽到截止）
 */
export function isSigninWindowOpen(meetingDate: string): boolean {
  return !isSigninNotYetOpen(meetingDate) && !isSigninClosed(meetingDate)
}

/**
 * 顯示用：簽到時段文字
 */
export function getSigninTimeLabel(): string {
  return `會議室 ${CHECKIN_TIMES.meetingRoomOpen} 開放｜簽到 ${CHECKIN_TIMES.signinStart}～${CHECKIN_TIMES.signinDeadline}｜${CHECKIN_TIMES.lotteryCutoff} 前簽到才進獎品區`
}
