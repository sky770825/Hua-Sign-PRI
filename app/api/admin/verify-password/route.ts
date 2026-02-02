import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DEFAULT_PASSWORD = 'h123'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const password = body?.password || ''
    const validPassword = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD
    return NextResponse.json({ valid: password === validPassword })
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 })
  }
}
