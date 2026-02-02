/**
 * Lib 統一匯出
 * 可選：import { apiError, supabase } from '@/lib'
 */

export {
  apiError,
  apiSuccess,
  validateDate,
  validateMemberId,
  validateStringLength,
  validateNumberRange,
  safeJsonParse,
  handleDatabaseError,
} from './api-utils'

export { supabase, supabaseService, TABLES, BUCKETS, STORAGE_PATHS, generateStoragePath } from './supabase'
export { withCache, CacheKeys, CacheConfig, clearCacheByPrefix } from './cache'
export { formatId, formatIdWithHash } from './format-utils'
export {
  safeApiCall,
  filterVercelText,
  formatDate,
  formatDateTime,
  debounce,
  throttle,
  delay,
} from './frontend-utils'
export { validateMember, validateCheckin, validateMeeting, validatePrize } from './validation'
export type { ValidationResult } from './validation'

// 前端服務層
export * from './services'
