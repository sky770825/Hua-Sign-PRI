/**
 * 伺服器端快取工具
 * 使用記憶體快取常用資料，減少資料庫查詢次數
 */

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // 快取有效期（毫秒）
}

class CacheManager {
  private cache: Map<string, CacheItem<any>> = new Map()
  private defaultTTL: number = 5 * 60 * 1000 // 預設 5 分鐘

  /**
   * 獲取快取資料
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // 檢查是否過期
    const now = Date.now()
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  /**
   * 設置快取資料
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const cacheTTL = ttl || this.defaultTTL

    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: cacheTTL,
    })
  }

  /**
   * 刪除快取
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * 清除所有快取
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 清除特定前綴的快取（例如清除所有會員相關快取）
   */
  clearByPrefix(prefix: string): void {
    const keysToDelete: string[] = []
    
    this.cache.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * 清理過期快取
   */
  cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.cache.forEach((item, key) => {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * 獲取快取統計信息
   */
  getStats() {
    const now = Date.now()
    let expiredCount = 0
    let activeCount = 0

    this.cache.forEach((item) => {
      if (now - item.timestamp > item.ttl) {
        expiredCount++
      } else {
        activeCount++
      }
    })

    return {
      total: this.cache.size,
      active: activeCount,
      expired: expiredCount,
    }
  }
}

// 創建全局快取實例
const cacheManager = new CacheManager()

// 定期清理過期快取（每 10 分鐘）
// 使用延遲初始化，避免在模組載入時立即執行
let cleanupInterval: NodeJS.Timeout | null = null

function initCleanupInterval() {
  if (cleanupInterval === null && typeof setInterval !== 'undefined') {
    cleanupInterval = setInterval(() => {
      cacheManager.cleanup()
    }, 10 * 60 * 1000)
  }
}

// 只在需要時初始化（首次使用時）
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  // 開發環境：立即初始化
  initCleanupInterval()
}

/**
 * 快取鍵生成器
 */
export const CacheKeys = {
  // 會員相關
  MEMBERS: 'members:all',
  MEMBER: (id: number) => `members:${id}`,
  
  // 會議相關
  MEETINGS: 'meetings:all',
  MEETING: (id: number) => `meetings:${id}`,
  MEETING_BY_DATE: (date: string) => `meetings:date:${date}`,
  
  // 獎品相關
  PRIZES: 'prizes:all',
  PRIZE: (id: number) => `prizes:${id}`,
  
  // 簽到相關
  CHECKINS: (date: string) => `checkins:date:${date}`,
  
  // 中獎記錄相關
  WINNERS: (date: string) => `winners:date:${date}`,
  WINNER: (id: number) => `winners:${id}`,
} as const

/**
 * 快取配置
 */
export const CacheConfig = {
  // 會員快取：10 分鐘（會員資料變化較少）
  MEMBERS_TTL: 10 * 60 * 1000,
  
  // 會議快取：5 分鐘
  MEETINGS_TTL: 5 * 60 * 1000,
  
  // 獎品快取：5 分鐘
  PRIZES_TTL: 5 * 60 * 1000,
  
  // 簽到快取：1 分鐘（簽到資料變化較頻繁）
  CHECKINS_TTL: 60 * 1000,
  
  // 中獎記錄快取：2 分鐘
  WINNERS_TTL: 2 * 60 * 1000,
} as const

/**
 * 快取裝飾器：自動處理快取的 GET 請求
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // 確保清理間隔已初始化
  initCleanupInterval()
  
  // 先嘗試從快取獲取
  const cached = cacheManager.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // 快取未命中，執行查詢
  const data = await fetchFn()
  
  // 存入快取
  cacheManager.set(key, data, ttl)
  
  return data
}

/**
 * 清除快取
 */
export function clearCache(key: string): void {
  cacheManager.delete(key)
}

/**
 * 清除前綴相關的快取
 */
export function clearCacheByPrefix(prefix: string): void {
  cacheManager.clearByPrefix(prefix)
}

/**
 * 獲取快取統計
 */
export function getCacheStats() {
  return cacheManager.getStats()
}

// 導出快取管理器（用於進階操作）
export { cacheManager }
