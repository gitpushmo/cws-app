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

    // Only admins can set customer prices
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Alleen admins kunnen customer prices instellen' },
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

    const { customer_price } = await request.json()

    if (customer_price === undefined || customer_price === null) {
      return NextResponse.json(
        { error: 'Customer price is verplicht' },
        { status: 400 }
      )
    }

    if (customer_price < 0) {
      return NextResponse.json(
        { error: 'Customer price kan niet negatief zijn' },
        { status: 400 }
      )
    }

    // Get line item to check access via quote and validate business logic
    const { data: lineItem, error: lineItemError } = await supabase
      .from('line_items')
      .select('quote_id, cutting_price')
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

    // Only allow customer price setting on quotes ready for pricing
    const allowedStatuses = ['ready_for_pricing', 'sent']
    if (!allowedStatuses.includes(quote.status)) {
      return NextResponse.json(
        { error: `Customer price kan alleen worden ingesteld voor offerte met status ready_for_pricing of sent` },
        { status: 400 }
      )
    }

    // Business rule: customer price should be >= cutting price (profit margin)
    if (lineItem.cutting_price && parseFloat(customer_price) < parseFloat(lineItem.cutting_price)) {
      return NextResponse.json(
        { error: 'Customer price kan niet lager zijn dan cutting price' },
        { status: 400 }
      )
    }

    // Update line item with customer price
    const { data: updatedLineItem, error: updateError } = await supabase
      .from('line_items')
      .update({
        customer_price: parseFloat(customer_price),
        updated_at: new Date().toISOString()
      })
      .eq('id', lineItemId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating line item customer price:', updateError)
      return NextResponse.json(
        { error: 'Fout bij bijwerken customer price', details: updateError.message },
        { status: 500 }
      )
    }

    // Recalculate quote totals
    await recalculateQuoteTotals(supabase, lineItem.quote_id)

    return NextResponse.json(updatedLineItem)

  } catch (error) {
    console.error('Unexpected error in PUT /api/line-items/[id]/customer-price:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}

// Helper function to recalculate quote totals
async function recalculateQuoteTotals(supabase: any, quoteId: number) {
  try {
    // Get all line items for the quote
    const { data: lineItems } = await supabase
      .from('line_items')
      .select('cutting_price, customer_price, production_time_hours, quantity')
      .eq('quote_id', quoteId)

    if (!lineItems) return

    // Calculate totals
    let totalCuttingPrice = 0
    let totalCustomerPrice = 0
    let totalProductionTime = 0

    for (const item of lineItems) {
      const quantity = item.quantity || 1

      if (item.cutting_price) {
        totalCuttingPrice += parseFloat(item.cutting_price) * quantity
      }

      if (item.customer_price) {
        totalCustomerPrice += parseFloat(item.customer_price) * quantity
      }

      if (item.production_time_hours) {
        totalProductionTime += parseFloat(item.production_time_hours) * quantity
      }
    }

    // Update quote totals
    await supabase
      .from('quotes')
      .update({
        total_cutting_price: totalCuttingPrice > 0 ? totalCuttingPrice : null,
        total_customer_price: totalCustomerPrice > 0 ? totalCustomerPrice : null,
        production_time_hours: totalProductionTime > 0 ? totalProductionTime : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId)

  } catch (error) {
    console.error('Error recalculating quote totals:', error)
    // Don't throw - this is a background calculation
  }
}