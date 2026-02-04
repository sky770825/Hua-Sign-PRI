import { NextResponse } from 'next/server'
import { supabaseService, TABLES } from '@/lib/supabase'
import { apiError, apiSuccess, safeJsonParse, handleDatabaseError } from '@/lib/api-utils'
import { isLotteryClosed, isLotteryExpired } from '@/lib/lottery-deadline'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { data: body, error: parseError } = await safeJsonParse<{ date?: string; prizeIds?: number[]; _testBypassTime?: boolean }>(request)
    
    if (parseError) {
      return apiError('請求格式錯誤：無法解析 JSON', 400)
    }

    const { date, prizeIds, _testBypassTime } = body || {}
    const targetDate = date || new Date().toISOString().split('T')[0]

    // 驗證日期格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return apiError('日期格式錯誤，應為 YYYY-MM-DD', 400)
    }

    // 抽獎僅限例會日 6:30～7:00，7:00 起關閉（開發環境可傳 _testBypassTime: true 繞過時間檢查）
    const skipTimeCheck = process.env.NODE_ENV === 'development' && _testBypassTime === true
    if (!skipTimeCheck && isLotteryClosed(targetDate)) {
      return apiError('抽獎已結束（例會日 6:30～7:00 可抽獎，7:00 截止）', 400)
    }

    // 獎品區僅計 7:00 前簽到者（checkin_time < 例會日 07:00 台北）
    const LOTTERY_CUTOFF = new Date(targetDate + 'T07:00:00+08:00').toISOString()
    const ATTENDANCE_STATUSES = ['present', 'early', 'late', 'early_leave', 'proxy']

    // 1. 獲取 7:00 前簽到的人數（獎品區名單）
    const { data: lotteryCheckinsRaw, error: countError } = await supabaseService
      .from(TABLES.CHECKINS)
      .select('member_id, checkin_time')
      .eq('meeting_date', targetDate)
      .in('status', ATTENDANCE_STATUSES)

    if (countError) {
      console.error('Error fetching checkins:', countError)
      return apiError(`查詢簽到人數失敗：${handleDatabaseError(countError)}`, 500)
    }

    const eligibleForLottery = (lotteryCheckinsRaw || []).filter((c: any) => {
      const ct = c.checkin_time
      if (!ct) return false
      return new Date(ct).getTime() < new Date(LOTTERY_CUTOFF).getTime()
    })
    const totalCheckins = eligibleForLottery.length

    if (totalCheckins === 0) {
      return apiError('7:00 前無簽到會員可參加抽獎', 400)
    }

    // 2. 獲取已中獎人數
    const { data: winnersData } = await supabaseService
      .from(TABLES.LOTTERY_WINNERS)
      .select('id')
      .eq('meeting_date', targetDate)
    const totalWinners = winnersData?.length ?? 0

    // 3. 獲取可抽獎的簽到會員（7:00 前簽到、排除已中獎）
    const memberIdsBefore7 = Array.from(new Set(eligibleForLottery.map((c: any) => c.member_id)))
    const { data: allCheckins } = await supabaseService
      .from(TABLES.CHECKINS)
      .select(`
        member_id,
        checkin_time,
        estate_attendance_members!inner(id, name)
      `)
      .eq('meeting_date', targetDate)
      .in('member_id', memberIdsBefore7)
      .in('status', ATTENDANCE_STATUSES) as any

    const { data: existingWinners } = await supabaseService
      .from(TABLES.LOTTERY_WINNERS)
      .select('member_id')
      .eq('meeting_date', targetDate)

    const winnerMemberIds = new Set((existingWinners || []).map((w: any) => w.member_id))
    const cutoffTs = new Date(LOTTERY_CUTOFF).getTime()
    
    const eligibleCheckins = (allCheckins || []).filter((c: any) => {
      if (winnerMemberIds.has(c.member_id)) return false
      const ct = c.checkin_time
      if (!ct) return false
      return new Date(ct).getTime() < cutoffTs
    })

    if (eligibleCheckins.length === 0) {
      return NextResponse.json(
        { error: '今日可抽獎人數已抽完' },
        { status: 400 }
      )
    }

    // 4. 獲取可用獎品
    const { data: prizes } = await supabaseService
      .from(TABLES.PRIZES)
      .select('*')
      .gt('remaining_quantity', 0)
      .order('id', { ascending: true })

    if (!prizes || prizes.length === 0) {
      return NextResponse.json(
        { error: '沒有可用的獎品' },
        { status: 400 }
      )
    }

    // 5. 平均隨機選擇獲獎者（每個簽到會員中獎機率相等）
    const winnerIndex = Math.floor(Math.random() * eligibleCheckins.length)
    const winner = eligibleCheckins[winnerIndex]

    // 6. 平均隨機選擇獎品（每個可用獎品被抽中機率相等，不考慮 probability）
    // 只從有剩餘數量的獎品中隨機選擇
    let availablePrizes = prizes.filter((prize: any) => prize.remaining_quantity > 0)
    // 若有傳入 prizeIds，則只從勾選的品項中抽（需與可用獎品取交集）
    if (prizeIds && Array.isArray(prizeIds) && prizeIds.length > 0) {
      const idsSet = new Set(prizeIds)
      availablePrizes = availablePrizes.filter((p: any) => idsSet.has(p.id))
    }
    
    if (availablePrizes.length === 0) {
      return NextResponse.json(
        { error: '沒有可用的獎品' },
        { status: 400 }
      )
    }

    // 平均隨機選擇獎品
    const prizeIndex = Math.floor(Math.random() * availablePrizes.length)
    const selectedPrize = availablePrizes[prizeIndex]

    // 7. 更新獎品剩餘數量（使用原子操作）
    const { data: updatedPrize, error: updateError } = await supabaseService
      .from(TABLES.PRIZES)
      .update({
        remaining_quantity: selectedPrize.remaining_quantity - 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedPrize.id)
      .gt('remaining_quantity', 0)
      .select()
      .single()

    if (updateError || !updatedPrize) {
      return NextResponse.json(
        { error: '獎品已被抽完，請再試一次' },
        { status: 409 }
      )
    }

    // 8. 插入中獎記錄（初始狀態為 pending - 尚未領取）
    console.log('準備插入中獎記錄:', {
      meeting_date: targetDate,
      member_id: winner.member_id,
      prize_id: selectedPrize.id,
      claimed_status: 'pending',
    })

    const { data: insertedWinner, error: insertError } = await supabaseService
      .from(TABLES.LOTTERY_WINNERS)
      .insert([{
        meeting_date: targetDate,
        member_id: winner.member_id,
        prize_id: selectedPrize.id,
        claimed_status: 'pending', // 初始狀態：尚未領取
      }])
      .select()

    if (insertError) {
      console.error('❌ 插入中獎記錄失敗:', {
        error: insertError,
        message: insertError.message,
        code: (insertError as any).code,
        details: (insertError as any).details,
        meeting_date: targetDate,
        member_id: winner.member_id,
        prize_id: selectedPrize.id,
      })
      // 如果插入失敗，需要回滾獎品數量（但 Supabase 不支持事務，這裡只能記錄錯誤）
      return NextResponse.json(
        { error: `記錄中獎失敗：${insertError.message}` },
        { status: 500 }
      )
    }

    if (!insertedWinner || insertedWinner.length === 0) {
      console.error('❌ 插入中獎記錄未返回數據')
      return NextResponse.json(
        { error: '記錄中獎失敗：未返回插入的記錄' },
        { status: 500 }
      )
    }

    console.log('✅ 中獎記錄插入成功:', {
      insertedId: insertedWinner[0].id,
      meeting_date: targetDate,
      member_id: winner.member_id,
      prize_id: selectedPrize.id,
    })

    return NextResponse.json({
      success: true,
      prize: {
        id: updatedPrize.id,
        name: updatedPrize.name,
        image_url: updatedPrize.image_url,
        remaining_quantity: updatedPrize.remaining_quantity,
        completion_message: updatedPrize.completion_message || '感謝大家的參與！',
      },
      winner: {
        id: (winner.estate_attendance_members as any)?.id || winner.member_id,
        name: (winner.estate_attendance_members as any)?.name || '',
        member_id: winner.member_id,
      },
      totalCheckins,
      totalWinners: (totalWinners || 0) + 1,
      remainingEligible: eligibleCheckins.length - 1,
      winnerProbability: (1 / eligibleCheckins.length * 100).toFixed(2) + '%',
      prizeProbability: (1 / availablePrizes.length * 100).toFixed(2) + '%',
    })
  } catch (error) {
    console.error('Error drawing lottery:', error)
    return NextResponse.json(
      { error: 'Failed to draw lottery' },
      { status: 500 }
    )
  }
}
