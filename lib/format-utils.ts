/**
 * 格式化工具函數
 */

/**
 * 格式化編號為三位數（001, 002, 016, 110）
 * @param id 編號
 * @returns 格式化後的編號字串
 * 
 * @example
 * formatId(1) // "001"
 * formatId(16) // "016"
 * formatId(110) // "110"
 */
export function formatId(id: number | string): string {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id
  if (isNaN(numId) || numId < 0) return '000'
  return numId.toString().padStart(3, '0')
}

/**
 * 格式化編號顯示（帶#前綴）
 * @param id 編號
 * @returns 格式化後的編號字串（如 #001）
 */
export function formatIdWithHash(id: number | string): string {
  return `#${formatId(id)}`
}
