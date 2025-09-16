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

    // Build query based on role
    let query = supabase
      .from('orders')
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
        created_at,
        updated_at,
        quote:quotes (
          id,
          quote_number,
          customer_id,
          profiles!quotes_customer_id_fkey (
            name,
            email,
            company_name
          )
        )
      `)

    // Filter based on role
    if (profile.role === 'customer') {
      query = query.eq('customer_id', user.id)
    } else if (profile.role === 'operator') {
      query = query.eq('operator_id', user.id)
    }
    // Admin sees all orders (no filter)

    const { data: orders, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json(
        { error: 'Fout bij ophalen bestellingen', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(orders || [])

  } catch (error) {
    console.error('Unexpected error in GET /api/orders:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()
    const { quote_id } = body

    if (!quote_id) {
      return NextResponse.json(
        { error: 'Quote ID is verplicht' },
        { status: 400 }
      )
    }

    // Get quote details and validate it can be converted to order
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        id,
        status,
        customer_id,
        operator_id,
        total_customer_price
      `)
      .eq('id', quote_id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'Offerte niet gevonden' },
        { status: 404 }
      )
    }

    // Validate quote is accepted
    if (quote.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Alleen geaccepteerde offertes kunnen worden omgezet naar bestellingen' },
        { status: 400 }
      )
    }

    // Validate pricing is set
    if (!quote.total_customer_price) {
      return NextResponse.json(
        { error: 'Offerte heeft geen prijsstelling' },
        { status: 400 }
      )
    }

    // Check if order already exists for this quote
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('quote_id', quote_id)
      .single()

    if (existingOrder) {
      return NextResponse.json(
        { error: 'Er bestaat al een bestelling voor deze offerte', order: existingOrder },
        { status: 409 }
      )
    }

    // Generate order number
    const { data: sequenceData, error: sequenceError } = await supabase
      .rpc('get_next_sequence_number', { sequence_name: 'order' })

    if (sequenceError) {
      console.error('Error generating order number:', sequenceError)
      return NextResponse.json(
        { error: 'Fout bij genereren bestelnummer' },
        { status: 500 }
      )
    }

    const orderNumber = `O${String(sequenceData).padStart(6, '0')}`

    // Create order
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        quote_id: quote_id,
        customer_id: quote.customer_id,
        operator_id: quote.operator_id,
        status: 'pending',
        payment_status: 'pending',
        total_amount: quote.total_customer_price
      })
      .select(`
        id,
        order_number,
        status,
        payment_status,
        total_amount,
        created_at,
        quote:quotes (
          id,
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
      console.error('Error creating order:', error)
      return NextResponse.json(
        { error: 'Fout bij aanmaken bestelling', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(order, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in POST /api/orders:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}