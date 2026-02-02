/**
 * 簡單效能計時（僅在開發時輸出）
 * 用於標記卡頓點改造前後差異
 */
const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'

export function perfStart(label: string): void {
  if (isDev && typeof performance !== 'undefined' && performance.mark) {
    performance.mark(`${label}-start`)
  }
  if (isDev && typeof console !== 'undefined' && console.time) {
    console.time(`[perf] ${label}`)
  }
}

export function perfEnd(label: string): number {
  let ms = 0
  if (isDev && typeof performance !== 'undefined' && performance.mark && performance.measure) {
    try {
      performance.mark(`${label}-end`)
      performance.measure(label, `${label}-start`, `${label}-end`)
      const entry = performance.getEntriesByName(label).pop()
      ms = entry ? entry.duration : 0
      performance.clearMarks(`${label}-start`)
      performance.clearMarks(`${label}-end`)
      performance.clearMeasures(label)
    } catch (_) {}
  }
  if (isDev && typeof console !== 'undefined' && console.timeEnd) {
    console.timeEnd(`[perf] ${label}`)
  }
  return ms
}

/** 在 requestIdleCallback 可用時延後執行，否則 setTimeout(fn, 0) */
export function runWhenIdle(cb: () => void, options?: { timeout?: number }): void {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(cb, { timeout: options?.timeout ?? 2000 })
  } else {
    setTimeout(cb, 0)
  }
}

/** 分塊處理陣列，每塊之間讓出主執行緒（requestIdleCallback） */
export function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  processChunk: (chunk: T[]) => R[],
  onProgress?: (done: number, total: number) => void
): Promise<R[]> {
  const results: R[] = []
  let index = 0

  return new Promise((resolve) => {
    function runChunk(deadline?: IdleDeadline) {
      const canRun = !deadline || deadline.timeRemaining() > 2
      const end = Math.min(index + chunkSize, items.length)
      if (canRun && index < items.length) {
        const chunk = items.slice(index, end)
        results.push(...processChunk(chunk))
        index = end
        onProgress?.(index, items.length)
      }
      if (index >= items.length) {
        resolve(results)
        return
      }
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(runChunk, { timeout: 2000 })
      } else {
        setTimeout(() => runChunk(), 0)
      }
    }
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(runChunk, { timeout: 2000 })
    } else {
      runChunk()
    }
  })
}
