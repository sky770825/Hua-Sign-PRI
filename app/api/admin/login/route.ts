import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_FAILED_ATTEMPTS = 5
const BLOCK_DURATION_MS = 15 * 60 * 1000
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000

type AttemptState = {
  failedCount: number
  lastAttemptAt: number
  blockedUntil: number
}

const loginAttempts = new Map<string, AttemptState>()

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfIp = request.headers.get('cf-connecting-ip')
  const ip = forwardedFor?.split(',')[0]?.trim() || cfIp || realIp || 'unknown'
  return `ip:${ip}`
}

function getState(key: string, now: number): AttemptState {
  const state = loginAttempts.get(key)
  if (!state) {
    return { failedCount: 0, lastAttemptAt: 0, blockedUntil: 0 }
  }

  if (now - state.lastAttemptAt > ATTEMPT_WINDOW_MS) {
    return { failedCount: 0, lastAttemptAt: state.lastAttemptAt, blockedUntil: 0 }
  }

  return state
}

function setState(key: string, state: AttemptState, now: number) {
  loginAttempts.set(key, state)

  // 清理長時間未使用的記錄，避免 Map 無限制成長
  if (loginAttempts.size > 1000) {
    for (const [k, v] of loginAttempts.entries()) {
      if (now - v.lastAttemptAt > 24 * 60 * 60 * 1000) {
        loginAttempts.delete(k)
      }
    }
  }
}

export async function POST(request: Request) {
  try {
    const validPassword = process.env.ADMIN_PASSWORD
    if (!validPassword) {
      return NextResponse.json(
        { success: false, error: '後台登入未啟用：請先設定 ADMIN_PASSWORD 環境變數' },
        { status: 503 }
      )
    }

    const now = Date.now()
    const clientKey = getClientKey(request)
    const currentState = getState(clientKey, now)
    if (currentState.blockedUntil > now) {
      const retryAfterSec = Math.ceil((currentState.blockedUntil - now) / 1000)
      return NextResponse.json(
        { success: false, error: `嘗試次數過多，請在 ${retryAfterSec} 秒後再試` },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSec),
          },
        }
      )
    }

    const body = await request.json().catch(() => ({}))
    const password = body?.password || ''

    if (!password || password !== validPassword) {
      const failedCount = currentState.failedCount + 1
      const nextState: AttemptState = {
        failedCount,
        lastAttemptAt: now,
        blockedUntil: failedCount >= MAX_FAILED_ATTEMPTS ? now + BLOCK_DURATION_MS : 0,
      }
      setState(clientKey, nextState, now)

      if (nextState.blockedUntil > now) {
        return NextResponse.json(
          { success: false, error: '密碼錯誤次數過多，已暫時鎖定 15 分鐘' },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil(BLOCK_DURATION_MS / 1000)),
            },
          }
        )
      }

      return NextResponse.json({ success: false, error: '密碼錯誤' }, { status: 401 })
    }

    loginAttempts.delete(clientKey)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({ success: false, error: '驗證失敗' }, { status: 500 })
  }
}
