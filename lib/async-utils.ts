/**
 * 非同步處理工具函數
 * 用於將耗時的資料處理改為非同步執行，避免阻塞 UI
 */

/**
 * 使用 requestIdleCallback 執行非關鍵任務
 * 如果瀏覽器不支持，則使用 setTimeout 作為降級方案
 */
export function runInIdle(callback: () => void, timeout = 5000): void {
  if (typeof window === 'undefined') {
    // 伺服器端直接執行
    callback()
    return
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout })
    return
  }

  // 降級方案：使用 setTimeout
  setTimeout(callback, 0)
}

/**
 * 將大量資料分批處理，避免阻塞 UI
 * @param items 要處理的資料陣列
 * @param processor 處理函數
 * @param batchSize 每批處理的數量
 * @param delay 每批之間的延遲（毫秒）
 */
export async function processInBatches<T, R>(
  items: T[],
  processor: (item: T, index: number) => R,
  batchSize = 50,
  delay = 10
): Promise<R[]> {
  const results: R[] = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = batch.map((item, index) => processor(item, i + index))
    results.push(...batchResults)
    
    // 如果不是最後一批，延遲一下讓 UI 有機會更新
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  return results
}

/**
 * 使用 requestIdleCallback 分批處理大量資料
 */
export function processInBatchesIdle<T, R>(
  items: T[],
  processor: (item: T, index: number) => R,
  onProgress?: (processed: number, total: number) => void,
  batchSize = 50
): Promise<R[]> {
  return new Promise((resolve) => {
    const results: R[] = []
    let currentIndex = 0
    
    const processBatch = () => {
      const endIndex = Math.min(currentIndex + batchSize, items.length)
      
      for (let i = currentIndex; i < endIndex; i++) {
        results.push(processor(items[i], i))
      }
      
      currentIndex = endIndex
      
      if (onProgress) {
        onProgress(currentIndex, items.length)
      }
      
      if (currentIndex < items.length) {
        // 繼續處理下一批
        runInIdle(processBatch)
      } else {
        // 處理完成
        resolve(results)
      }
    }
    
    // 開始處理
    runInIdle(processBatch)
  })
}

/**
 * 延遲執行函數，確保不會阻塞 UI
 */
export function defer<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => {
    runInIdle(() => {
      resolve(fn())
    })
  })
}

/**
 * 將同步計算改為非同步執行
 */
export async function asyncCompute<T>(
  computeFn: () => T,
  chunkSize = 1000
): Promise<T> {
  return new Promise((resolve) => {
    runInIdle(() => {
      resolve(computeFn())
    })
  })
}
