import { NextResponse } from 'next/server'
import { insforge, TABLES } from '@/lib/insforge'

// 背景同步到 Google Sheets 的輔助函數
async function syncToGoogleSheets() {
  try {
    // 只在環境變數設置時才同步
    if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
      return
    }
    
    const { data: members } = await insforge.database
      .from(TABLES.MEMBERS)
      .select('id, name, profession')
      .order('id', { ascending: true })
    
    if (members && members.length > 0) {
      const { syncMembersToSheets } = await import('@/lib/google-sheets')
      await syncMembersToSheets(members)
    }
  } catch (error) {
    // 靜默失敗，不影響主要操作
    console.warn('背景同步到 Google Sheets 失敗:', error)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name, profession } = await request.json()
    const id = parseInt(params.id)

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    console.log('更新會員:', { id, name, profession })
    
    const { data, error } = await insforge.database
      .from(TABLES.MEMBERS)
      .update({
        name,
        profession: profession || null,
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('Database error updating member:', {
        error,
        message: error.message,
        code: (error as any).code,
        id,
      })
      
      return NextResponse.json(
        { error: `更新會員失敗：${error.message || '資料庫錯誤'}` },
        { status: 500 }
      )
    }

    console.log('會員更新成功:', data)
    
    // 背景同步到 Google Sheets（不阻塞響應）
    syncToGoogleSheets().catch(err => {
      console.error('背景同步到 Google Sheets 失敗:', err)
    })
    
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error updating member:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update member'
    return NextResponse.json(
      { error: '更新會員失敗，請稍後再試' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    console.log('刪除會員:', { id })

    // 檢查會員是否存在
    const { data: member, error: fetchError } = await insforge.database
      .from(TABLES.MEMBERS)
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !member) {
      console.error('Member not found:', { id, fetchError })
      return NextResponse.json(
        { error: '會員不存在' },
        { status: 404 }
      )
    }

    // 檢查是否有簽到記錄引用此會員
    const { data: checkins, error: checkinsError } = await insforge.database
      .from(TABLES.CHECKINS)
      .select('id')
      .eq('member_id', id)
      .limit(1)

    if (checkinsError) {
      console.warn('Error checking checkins:', checkinsError)
      // 繼續嘗試刪除，如果真的有外鍵約束，資料庫會阻止
    }

    if (checkins && checkins.length > 0) {
      console.log('會員有簽到記錄，自動刪除相關記錄:', { 
        id, 
        memberName: member.name,
        checkinCount: checkins.length 
      })
      
      // 先刪除相關的簽到記錄
      const { error: deleteCheckinsError } = await insforge.database
        .from(TABLES.CHECKINS)
        .delete()
        .eq('member_id', id)
      
      if (deleteCheckinsError) {
        console.error('Error deleting checkins:', deleteCheckinsError)
        return NextResponse.json(
          { error: `無法刪除會員：此會員有簽到記錄，且無法自動刪除。請先手動刪除相關簽到記錄。` },
          { status: 400 }
        )
      }
      
      // 同時刪除相關的中獎記錄（如果有的話）
      const { error: deleteWinnersError } = await insforge.database
        .from(TABLES.LOTTERY_WINNERS)
        .delete()
        .eq('member_id', id)
      
      if (deleteWinnersError) {
        console.warn('Error deleting lottery winners:', deleteWinnersError)
        // 繼續刪除會員，即使中獎記錄刪除失敗
      }
      
      console.log('相關記錄已刪除，繼續刪除會員')
    }

    // 刪除會員
    const { data, error, count } = await insforge.database
      .from(TABLES.MEMBERS)
      .delete({ count: 'exact' })
      .eq('id', id)
      .select()

    if (error) {
      console.error('Database error deleting member:', {
        error,
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        id,
      })
      
      const errorMessage = String(error.message || '')
      const errorCode = String((error as any).code || '')
      
      // 檢查是否為外鍵約束錯誤
      if (errorCode === '23503' || 
          errorMessage.includes('foreign key') || 
          errorMessage.includes('constraint') ||
          errorMessage.includes('referenced')) {
        return NextResponse.json(
          { error: '無法刪除會員：此會員有相關記錄，請先刪除相關記錄。系統已嘗試自動刪除，但可能仍有其他引用。' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: `刪除會員失敗：${errorMessage || '資料庫錯誤'} (錯誤碼: ${errorCode})` },
        { status: 500 }
      )
    }

    // 檢查是否真的刪除了（count 或 data 應該有值）
    if (!data || (count !== undefined && count === 0)) {
      console.warn('會員刪除失敗：沒有刪除任何記錄', { id, data, count })
      return NextResponse.json(
        { error: '刪除會員失敗：會員不存在或已被刪除' },
        { status: 404 }
      )
    }

    console.log('會員刪除成功:', { id, deleted: data, count })
    
    // 背景同步到 Google Sheets（不阻塞響應）
    syncToGoogleSheets().catch(err => {
      console.error('背景同步到 Google Sheets 失敗:', err)
    })
    
    return NextResponse.json({ success: true, data, deleted: (count || data?.length || 0) > 0 })
  } catch (error) {
    console.error('Error deleting member:', error)
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    
    // 檢查是否為外鍵約束錯誤
    if (errorMessage.includes('foreign key') || errorMessage.includes('constraint')) {
      return NextResponse.json(
        { error: '無法刪除會員：此會員有相關記錄，請先刪除相關記錄。' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: `刪除會員失敗：${errorMessage}` },
      { status: 500 }
    )
  }
}

