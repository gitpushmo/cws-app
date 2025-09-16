import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
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

    if (!profile) {
      return NextResponse.json(
        { error: 'Gebruikersprofiel niet gevonden' },
        { status: 404 }
      )
    }

    // Build query with role-based filtering
    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        payment_status,
        mollie_payment_id,
        total_amount,
        invoice_url,
        shipping_tracking_number,
        production_started_at,
        production_completed_at,
        shipped_at,
        created_at,
        updated_at,
        quote:quotes (
          id,
          quote_number,
          deadline,
          shipping_address,
          notes,
          profiles!quotes_customer_id_fkey (
            name,
            email,
            company_name,
            phone
          ),
          line_items (
            id,
            dxf_file_name,
            pdf_file_name,
            quantity,
            customer_price,
            materials (
              name,
              thickness_mm
            )
          )
        )
      `)
      .eq('id', id)

    // Apply role-based filters
    if (profile.role === 'customer') {
      query = query.eq('customer_id', user.id)
    } else if (profile.role === 'operator') {
      query = query.eq('operator_id', user.id)
    }
    // Admin sees all orders (no filter)

    const { data: order, error } = await query.single()

    if (error || !order) {
      return NextResponse.json(
        { error: 'Bestelling niet gevonden' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)

  } catch (error) {
    console.error('Unexpected error in GET /api/orders/[id]:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}

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

    if (!profile || !['admin', 'operator'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Alleen operators en admins kunnen bestellingen bijwerken' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      status,
      payment_status,
      shipping_tracking_number,
      production_started_at,
      production_completed_at,
      shipped_at,
      invoice_url
    } = body

    // Build update object (only include provided fields)
    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (payment_status !== undefined) updateData.payment_status = payment_status
    if (shipping_tracking_number !== undefined) updateData.shipping_tracking_number = shipping_tracking_number
    if (production_started_at !== undefined) updateData.production_started_at = production_started_at
    if (production_completed_at !== undefined) updateData.production_completed_at = production_completed_at
    if (shipped_at !== undefined) updateData.shipped_at = shipped_at
    if (invoice_url !== undefined) updateData.invoice_url = invoice_url

    // Auto-set timestamps based on status changes
    if (status === 'in_production' && !updateData.production_started_at) {
      updateData.production_started_at = new Date().toISOString()
    }
    if (status === 'completed' && !updateData.production_completed_at) {
      updateData.production_completed_at = new Date().toISOString()
    }
    if (status === 'shipped' && !updateData.shipped_at) {
      updateData.shipped_at = new Date().toISOString()
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Geen velden om bij te werken' },
        { status: 400 }
      )
    }

    updateData.updated_at = new Date().toISOString()

    // Update order
    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        order_number,
        status,
        payment_status,
        total_amount,
        shipping_tracking_number,
        production_started_at,
        production_completed_at,
        shipped_at,
        updated_at,
        quote:quotes (
          quote_number,
          profiles!quotes_customer_id_fkey (
            name,
            email,
            company_name
          )
        )
      `)
      .single()

    if (error) {
      console.error('Error updating order:', error)
      return NextResponse.json(
        { error: 'Fout bij bijwerken bestelling', details: error.message },
        { status: 500 }
      )
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Bestelling niet gevonden' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)

  } catch (error) {
    console.error('Unexpected error in PATCH /api/orders/[id]:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}