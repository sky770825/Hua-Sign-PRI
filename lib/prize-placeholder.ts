/**
 * 獎品預設圖片（無圖片時使用）
 * 使用 picsum 固定種子，每種獎品類型有不同但穩定的圖片
 */
export const PRIZE_PLACEHOLDER_BASE = 'https://picsum.photos/seed/estate-prize'

/**
 * 取得獎品圖片 URL，若無則回傳 placeholder
 */
export function getPrizeImageUrl(prize: { id: number; image_url?: string | null }): string {
  if (prize?.image_url && prize.image_url.trim()) {
    return prize.image_url
  }
  return `${PRIZE_PLACEHOLDER_BASE}-${prize?.id || 0}/200/200`
}
