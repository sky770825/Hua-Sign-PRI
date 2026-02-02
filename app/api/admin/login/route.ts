import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DEFAULT_PASSWORD = 'h123'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const password = body?.password || ''

    const validPassword = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD

    if (!password || password !== validPassword) {
      return NextResponse.json({ success: false, error: '密碼錯誤' }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({ success: false, error: '驗證失敗' }, { status: 500 })
  }
}
