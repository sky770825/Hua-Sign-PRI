import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const password = body?.password || ''
    const validPassword = process.env.ADMIN_PASSWORD

    if (!validPassword) {
      return NextResponse.json(
        { valid: false, error: '後台登入未啟用：請先設定 ADMIN_PASSWORD 環境變數' },
        { status: 503 }
      )
    }

    return NextResponse.json({ valid: password === validPassword })
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 })
  }
}
