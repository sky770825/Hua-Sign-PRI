import { createClient } from '@supabase/supabase-js';

// Supabase 後端配置（僅從環境變數讀取，不硬編碼 key）
// 建置時若無 env，使用 placeholder 避免 createClient 拋錯「supabaseUrl 為必填項」
// 僅在建置階段使用，執行時需在 Vercel 或 .env.local 設定真實值
const PLACEHOLDER_URL = 'https://build-placeholder.supabase.co'
const PLACEHOLDER_KEY = 'build-placeholder-key-not-for-runtime'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY

// 服務端 key 用於繞過 RLS、檔案上傳等（支援兩種常見變數名稱）
let supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

// 偵測錯誤的 key 格式：sbp_xxx 是 CLI token，不是 service_role JWT
if (typeof window === 'undefined' && supabaseServiceKey && supabaseServiceKey.startsWith('sbp_')) {
  console.error(
    '\n🚨 SUPABASE_SERVICE_KEY 設定錯誤！\n' +
    '當前值是 Supabase CLI access token (sbp_xxx)，不是 service_role key。\n' +
    '請前往 https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/settings/api\n' +
    '複製 service_role 的 JWT（格式為 eyJ...），更新 .env.local 中的 SUPABASE_SERVICE_KEY。\n'
  )
  supabaseServiceKey = supabaseAnonKey
}

// 創建 Supabase 客戶端（用於一般資料庫操作）
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 創建服務端客戶端（用於文件上傳，避免外鍵約束錯誤）
export const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

// 表名常量（使用 estate_attendance_ 前綴）
export const TABLES = {
  MEMBERS: 'estate_attendance_members',
  MEETINGS: 'estate_attendance_meetings',
  CHECKINS: 'estate_attendance_checkins',
  PRIZES: 'estate_attendance_prizes',
  LOTTERY_WINNERS: 'estate_attendance_lottery_winners',
} as const;

// 儲存桶名稱（與 Supabase 儲存桶名稱一致）
// 使用 estate_attendance 儲存桶，所有文件通過子資料夾分類管理：
//   - prizes/          : 獎品圖片
//   - meetings/        : 會議相關文件（未來可擴展）
//   - members/         : 會員相關文件（未來可擴展）
//   - checkins/        : 簽到相關文件（未來可擴展）
//   這樣可以統一管理整個簽到系統的所有文件，避免與其他專案衝突
export const BUCKETS = {
  PRIZES: 'estate_attendance',
} as const;

// 文件資料夾路徑常量（統一管理所有文件路徑）
// 所有前端和後端的文件上傳都必須使用這些路徑常量
export const STORAGE_PATHS = {
  // 獎品相關
  PRIZES: 'prizes/prizes',
  
  // 會議相關（未來擴展）
  MEETINGS: 'meetings',
  MEETING_ATTACHMENTS: 'meetings/attachments',
  MEETING_PHOTOS: 'meetings/photos',
  
  // 會員相關（未來擴展）
  MEMBERS: 'members',
  MEMBER_AVATARS: 'members/avatars',
  MEMBER_DOCUMENTS: 'members/documents',
  
  // 簽到相關（未來擴展）
  CHECKINS: 'checkins',
  CHECKIN_ATTACHMENTS: 'checkins/attachments',
  CHECKIN_PHOTOS: 'checkins/photos',
} as const;

/**
 * 生成文件上傳路徑
 * @param category 文件分類（使用 STORAGE_PATHS 常量）
 * @param fileName 檔案名稱（可選，如果不提供會自動生成）
 * @returns 完整的文件路徑
 * 
 * @example
 * // 上傳獎品圖片
 * const path = generateStoragePath(STORAGE_PATHS.PRIZES, 'prize1.jpg')
 * // 返回: 'prizes/prizes/1234567890-abc123.jpg'
 * 
 * // 上傳會員頭像（未來擴展）
 * const path = generateStoragePath(STORAGE_PATHS.MEMBER_AVATARS, 'avatar.jpg')
 * // 返回: 'members/avatars/1234567890-xyz789.jpg'
 */
export function generateStoragePath(
  category: string,
  originalFileName?: string
): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  
  if (originalFileName) {
    // 清理檔案名稱，只保留安全的字符
    const fileExtension = originalFileName.split('.').pop()?.toLowerCase() || 'jpg'
    const sanitizedExtension = fileExtension.replace(/[^a-z0-9]/g, '')
    return `${category}/${timestamp}-${random}.${sanitizedExtension}`
  }
  
  // 如果沒有提供檔案名稱，使用預設的 jpg 擴展名
  return `${category}/${timestamp}-${random}.jpg`
}
