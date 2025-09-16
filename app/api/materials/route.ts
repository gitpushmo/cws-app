import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
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

    if (!profile) {
      return NextResponse.json(
        { error: 'Gebruikersprofiel niet gevonden' },
        { status: 404 }
      )
    }

    // Only operators and admins can see materials
    if (profile.role === 'customer') {
      return NextResponse.json(
        { error: 'Geen toegang tot materialen' },
        { status: 403 }
      )
    }

    // Get active materials
    const { data: materials, error } = await supabase
      .from('materials')
      .select(`
        id,
        name,
        thickness_mm,
        price_per_sqm,
        cutting_speed_factor,
        is_active
      `)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching materials:', error)
      return NextResponse.json(
        { error: 'Fout bij ophalen materialen', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(materials || [])

  } catch (error) {
    console.error('Unexpected error in GET /api/materials:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}