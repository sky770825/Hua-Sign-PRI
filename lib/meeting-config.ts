/**
 * 華地產 Zoom 會議室設定
 * 可透過環境變數 NEXT_PUBLIC_ZOOM_MEETING_URL、NEXT_PUBLIC_ZOOM_MEETING_ID 覆寫
 */
export const ZOOM_MEETING_URL: string =
  (process.env.NEXT_PUBLIC_ZOOM_MEETING_URL ?? '') || 'https://us06web.zoom.us/j/86358537640'

export const ZOOM_MEETING_ID_DISPLAY: string =
  (process.env.NEXT_PUBLIC_ZOOM_MEETING_ID ?? '') || '863 5853 7640'
