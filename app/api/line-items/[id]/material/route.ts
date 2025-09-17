import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role === 'customer') {
      return NextResponse.json(
        { error: 'Alleen operators en admins kunnen materialen toewijzen' },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const lineItemId = parseInt(resolvedParams.id)
    if (isNaN(lineItemId)) {
      return NextResponse.json(
        { error: 'Ongeldig line item ID' },
        { status: 400 }
      )
    }

    const { material_id, cutting_price, production_time_hours } = await request.json()
    if (!material_id) {
      return NextResponse.json(
        { error: 'Material ID is verplicht' },
        { status: 400 }
      )
    }

    // Verify material exists and is active
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('id, is_active')
      .eq('id', material_id)
      .single()

    if (materialError || !material || !material.is_active) {
      return NextResponse.json(
        { error: 'Ongeldig of inactief materiaal' },
        { status: 400 }
      )
    }

    // Get line item to check access via quote
    const { data: lineItem, error: lineItemError } = await supabase
      .from('line_items')
      .select('quote_id')
      .eq('id', lineItemId)
      .single()

    if (lineItemError) {
      if (lineItemError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Line item niet gevonden' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Fout bij ophalen line item' },
        { status: 500 }
      )
    }

    // Verify quote exists and user has access
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, status')
      .eq('id', lineItem.quote_id)
      .single()

    if (quoteError) {
      return NextResponse.json(
        { error: 'Offerte niet gevonden of geen toegang' },
        { status: 404 }
      )
    }

    // Only allow material assignment on quotes that are being processed
    const allowedStatuses = ['pending', 'needs_attention', 'ready_for_pricing']
    if (!allowedStatuses.includes(quote.status)) {
      return NextResponse.json(
        { error: `Materiaal kan niet worden toegewezen voor offerte met status: ${quote.status}` },
        { status: 400 }
      )
    }

    // Update line item with material and optional pricing data
    const updateData: any = {
      material_id: material_id,
      updated_at: new Date().toISOString()
    }

    // Add cutting price and production time if provided
    if (cutting_price !== undefined) {
      updateData.cutting_price = cutting_price
    }
    if (production_time_hours !== undefined) {
      updateData.production_time_hours = production_time_hours
    }

    const { data: updatedLineItem, error: updateError } = await supabase
      .from('line_items')
      .update(updateData)
      .eq('id', lineItemId)
      .select(`
        id,
        material_id,
        materials:material_id (
          id,
          name,
          thickness_mm,
          price_per_sqm
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating line item material:', updateError)
      return NextResponse.json(
        { error: 'Fout bij bijwerken materiaal', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedLineItem)

  } catch (error) {
    console.error('Unexpected error in PUT /api/line-items/[id]/material:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}