import { NextResponse } from 'next/server'
import { insforge, TABLES } from '@/lib/insforge'

export async function POST(request: Request) {
  try {
    const { date, status } = await request.json()

    if (!date) {
      return NextResponse.json(
        { error: 'Missing date field' },
        { status: 400 }
      )
    }

    // 檢查是否已存在
    const { data: existing } = await insforge.database
      .from(TABLES.MEETINGS)
      .select('*')
      .eq('date', date)
      .maybeSingle()

    console.log('創建/更新會議:', { date, status })
    
    if (existing) {
      // 更新
      const { data, error } = await insforge.database
        .from(TABLES.MEETINGS)
        .update({ status: status || 'scheduled' })
        .eq('date', date)
        .select()

      if (error) {
        console.error('Error updating meeting:', error)
        return NextResponse.json(
          { error: `更新會議失敗：${error.message || '資料庫錯誤'}` },
          { status: 500 }
        )
      }
      
      console.log('會議已更新:', data)
    } else {
      // 創建
      const { data, error } = await insforge.database
        .from(TABLES.MEETINGS)
        .insert([{ date, status: status || 'scheduled' }])
        .select()

      if (error) {
        console.error('Error creating meeting:', error)
        return NextResponse.json(
          { error: `創建會議失敗：${error.message || '資料庫錯誤'}` },
          { status: 500 }
        )
      }
      
      console.log('會議已創建:', data)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating/updating meeting:', error)
    return NextResponse.json(
      { error: 'Failed to create/update meeting' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { data: meetings, error } = await insforge.database
      .from(TABLES.MEETINGS)
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ meetings: meetings || [] })
  } catch (error) {
    console.error('Error fetching meetings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    )
  }
}

