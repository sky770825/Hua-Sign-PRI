import { NextResponse } from 'next/server'
import { supabaseService, TABLES } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * 健康檢查 API：診斷 Supabase 連線狀態
 * 訪問 /api/health 可查看後端連線是否正常（不洩露敏感資訊）
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const hasUrl = !!url && !url.includes('placeholder')
  const hasAnonKey = !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/^.*placeholder.*$/i, '')
  const serviceKey = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const hasServiceKey = !!serviceKey && !serviceKey.toLowerCase().includes('placeholder')
  const serviceKeyLooksJwt = serviceKey.startsWith('eyJ')
  const serviceKeyIsSbp = serviceKey.startsWith('sbp_')

  if (!hasUrl) {
    return NextResponse.json({
      ok: false,
      message: 'Supabase 環境變數未設定',
      hint: '請在 Vercel Settings > Environment Variables 設定 NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY、SUPABASE_SERVICE_KEY 或 SUPABASE_SERVICE_ROLE_KEY，然後重新部署',
      env: { hasUrl: false, hasAnonKey: false, hasServiceKey: false },
    }, { status: 503 })
  }

  try {
    const { data, error } = await supabaseService
      .from(TABLES.MEMBERS)
      .select('id')
      .limit(1)

    if (error) {
      return NextResponse.json({
        ok: false,
        message: 'Supabase 查詢失敗',
        errorCode: (error as any).code || 'UNKNOWN',
        hint: serviceKeyIsSbp
          ? 'service_key 使用了 sbp_ 開頭的 CLI token，請改用 service_role 的 JWT（eyJ 開頭）'
          : !serviceKeyLooksJwt
            ? '請設定 SUPABASE_SERVICE_KEY 或 SUPABASE_SERVICE_ROLE_KEY 為 service_role JWT（eyJ 開頭）'
            : '請確認 Supabase 專案未暫停，且 service_role key 正確',
        env: { hasUrl: true, hasAnonKey: hasAnonKey, hasServiceKey: hasServiceKey, serviceKeyLooksJwt, serviceKeyIsSbp },
      }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      message: 'Supabase 連線正常',
      membersCount: data?.length ?? 0,
      env: { hasUrl: true, hasAnonKey: true, hasServiceKey: true },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({
      ok: false,
      message: '連線發生異常',
      error: msg.substring(0, 200),
      hint: msg.includes('Invalid API key') || msg.includes('JWT')
        ? '請確認 SUPABASE_SERVICE_KEY 為正確的 service_role JWT'
        : msg.includes('fetch') || msg.includes('ECONNREFUSED')
          ? '無法連線 Supabase，請確認專案未暫停'
          : '請檢查 Vercel 環境變數設定',
      env: { hasUrl: true, hasAnonKey: hasAnonKey, hasServiceKey: hasServiceKey },
    }, { status: 500 })
  }
}
