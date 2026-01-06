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

    if (existing) {
      // 更新
      const { error } = await insforge.database
        .from(TABLES.MEETINGS)
        .update({ status: status || 'scheduled' })
        .eq('date', date)

      if (error) {
        throw error
      }
    } else {
      // 創建
      const { error } = await insforge.database
        .from(TABLES.MEETINGS)
        .insert([{ date, status: status || 'scheduled' }])

      if (error) {
        throw error
      }
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

