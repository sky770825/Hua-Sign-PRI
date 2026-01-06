import { NextResponse } from 'next/server'
import { insforge, TABLES } from '@/lib/insforge'

export async function GET() {
  try {
    const { data: members, error } = await insforge.database
      .from(TABLES.MEMBERS)
      .select('id, name, profession')
      .order('id', { ascending: true })

    if (error) {
      console.error('Error fetching members:', error)
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 500 }
      )
    }

    return NextResponse.json({ members: members || [] })
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}

