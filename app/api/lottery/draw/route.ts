import { NextResponse } from 'next/server'
import { supabaseService, TABLES } from '@/lib/supabase'
import { apiError, apiSuccess, safeJsonParse, handleDatabaseError } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { data: body, error: parseError } = await safeJsonParse<{ date?: string }>(request)
    
    if (parseError) {
      return apiError('請求格式錯誤：無法解析 JSON', 400)
    }

    const { date } = body || {}
    const targetDate = date || new Date().toISOString().split('T')[0]

    // 驗證日期格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return apiError('日期格式錯誤，應為 YYYY-MM-DD', 400)
    }

    // 出席狀態：present, early, late, early_leave, proxy 皆可參加抽獎
    const ATTENDANCE_STATUSES = ['present', 'early', 'late', 'early_leave', 'proxy']

    // 1. 獲取總簽到人數（含所有出席狀態）
    const { data: countData, error: countError } = await supabaseService
      .from(TABLES.CHECKINS)
      .select('member_id')
      .eq('meeting_date', targetDate)
      .in('status', ATTENDANCE_STATUSES)

    const totalCheckins = countData?.length ?? 0

    if (countError) {
      console.error('Error counting checkins:', countError)
      return apiError(`查詢簽到人數失敗：${handleDatabaseError(countError)}`, 500)
    }

    if (!totalCheckins || totalCheckins === 0) {
      return apiError('今天沒有簽到的會員', 400)
    }

    // 2. 獲取已中獎人數
    const { data: winnersData } = await supabaseService
      .from(TABLES.LOTTERY_WINNERS)
      .select('id')
      .eq('meeting_date', targetDate)
    const totalWinners = winnersData?.length ?? 0

    // 3. 獲取可抽獎的簽到會員（排除已中獎的，含所有出席狀態）
    const { data: allCheckins } = await supabaseService
      .from(TABLES.CHECKINS)
      .select(`
        member_id,
        estate_attendance_members!inner(id, name)
      `)
      .eq('meeting_date', targetDate)
      .in('status', ATTENDANCE_STATUSES) as any

    const { data: existingWinners } = await supabaseService
      .from(TABLES.LOTTERY_WINNERS)
      .select('member_id')
      .eq('meeting_date', targetDate)

    const winnerMemberIds = new Set((existingWinners || []).map((w: any) => w.member_id))
    
    const eligibleCheckins = (allCheckins || []).filter((c: any) => 
      !winnerMemberIds.has(c.member_id)
    )

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
    const availablePrizes = prizes.filter((prize: any) => prize.remaining_quantity > 0)
    
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
