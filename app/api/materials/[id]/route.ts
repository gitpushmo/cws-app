import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      )
    }

    // Get user profile for role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Alleen admins kunnen materialen bijwerken' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, thickness_mm, price_per_sqm, cutting_speed_factor, is_active } = body

    // Build update object (only include provided fields)
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (thickness_mm !== undefined) updateData.thickness_mm = parseFloat(thickness_mm)
    if (price_per_sqm !== undefined) updateData.price_per_sqm = parseFloat(price_per_sqm)
    if (cutting_speed_factor !== undefined) updateData.cutting_speed_factor = parseFloat(cutting_speed_factor)
    if (is_active !== undefined) updateData.is_active = Boolean(is_active)

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Geen velden om bij te werken' },
        { status: 400 }
      )
    }

    // Update material
    const { data: material, error } = await supabase
      .from('materials')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating material:', error)
      return NextResponse.json(
        { error: 'Fout bij bijwerken materiaal', details: error.message },
        { status: 500 }
      )
    }

    if (!material) {
      return NextResponse.json(
        { error: 'Materiaal niet gevonden' },
        { status: 404 }
      )
    }

    return NextResponse.json(material)

  } catch (error) {
    console.error('Unexpected error in PATCH /api/materials/[id]:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      )
    }

    // Get user profile for role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Alleen admins kunnen materialen deactiveren' },
        { status: 403 }
      )
    }

    // Soft delete by setting is_active to false
    const { data: material, error } = await supabase
      .from('materials')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error deactivating material:', error)
      return NextResponse.json(
        { error: 'Fout bij deactiveren materiaal', details: error.message },
        { status: 500 }
      )
    }

    if (!material) {
      return NextResponse.json(
        { error: 'Materiaal niet gevonden' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Materiaal gedeactiveerd', material })

  } catch (error) {
    console.error('Unexpected error in DELETE /api/materials/[id]:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}