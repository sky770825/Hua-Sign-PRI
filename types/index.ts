/**
 * 專案共用型別定義
 * 簽到系統：會員、會議、簽到、獎品、抽獎
 */

/** 會員 */
export interface Member {
  id: number
  name: string
  profession: string
}

/** 會議 */
export interface Meeting {
  id: number
  date: string
  status: string
}

/** 簽到記錄（列表用） */
export interface CheckinRecord {
  member_id: number
  checkin_time: string | null
  message: string | null
  status: string
  name?: string
}

/** 簽到用會員簡訊（抽獎頁） */
export interface CheckinMember {
  member_id: number
  name: string
}

/** 獎品 */
export interface Prize {
  id: number
  name: string
  image_url: string
  total_quantity: number
  remaining_quantity: number
  probability: number
  completion_message?: string
}

/** 中獎者簡訊 */
export interface Winner {
  id: number
  name: string
  member_id: number
}

/** 中獎記錄（含獎品與會員資訊） */
export interface WinnerRecord {
  id: number
  meeting_date: string
  created_at: string
  member_id: number
  member_name: string
  member_id_formatted?: string
  prize_id: number
  prize_name: string
  prize_image_url: string
  draw_order?: number
}

/** API 通用成功回應 */
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data?: T
  message?: string
}

/** API 通用錯誤回應 */
export interface ApiErrorResponse {
  success: false
  error: string
  details?: unknown
}
