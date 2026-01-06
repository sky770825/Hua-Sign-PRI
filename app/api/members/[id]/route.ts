import { NextResponse } from 'next/server'
import { insforge, TABLES } from '@/lib/insforge'

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

    const { error } = await insforge.database
      .from(TABLES.MEMBERS)
      .update({
        name,
        profession: profession || null,
      })
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating member:', error)
    return NextResponse.json(
      { error: 'Failed to update member' },
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

    const { error } = await insforge.database
      .from(TABLES.MEMBERS)
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting member:', error)
    return NextResponse.json(
      { error: 'Failed to delete member' },
      { status: 500 }
    )
  }
}

