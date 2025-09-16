import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
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

    // Only admins can trigger pricing calculations
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Alleen admins kunnen prijsberekeningen uitvoeren' },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const quoteId = parseInt(resolvedParams.id)
    if (isNaN(quoteId)) {
      return NextResponse.json(
        { error: 'Ongeldig offerte ID' },
        { status: 400 }
      )
    }

    // Get quote and validate
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, status, total_cutting_price')
      .eq('id', quoteId)
      .single()

    if (quoteError) {
      if (quoteError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Offerte niet gevonden' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Fout bij ophalen offerte' },
        { status: 500 }
      )
    }

    // Only allow pricing on quotes that are ready for pricing
    if (quote.status !== 'ready_for_pricing') {
      return NextResponse.json(
        { error: `Pricing kan alleen worden berekend voor offerte met status ready_for_pricing` },
        { status: 400 }
      )
    }

    // Get all line items with their current prices
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('line_items')
      .select(`
        id,
        cutting_price,
        customer_price,
        production_time_hours,
        quantity,
        materials:material_id (
          price_per_sqm
        )
      `)
      .eq('quote_id', quoteId)

    if (lineItemsError) {
      return NextResponse.json(
        { error: 'Fout bij ophalen line items' },
        { status: 500 }
      )
    }

    if (!lineItems || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Geen line items gevonden voor deze offerte' },
        { status: 400 }
      )
    }

    // SERVER-SIDE PRICING CALCULATIONS (never trust client)
    const pricingData = {
      line_items: [] as any[],
      total_cutting_price: 0,
      total_customer_price: 0,
      total_production_time: 0,
      margin_percentage: 0,
      calculated_at: new Date().toISOString()
    }

    for (const item of lineItems) {
      const quantity = item.quantity || 1

      // Basic validation - cutting price must exist
      if (!item.cutting_price) {
        return NextResponse.json(
          { error: `Line item ${item.id} heeft geen cutting price` },
          { status: 400 }
        )
      }

      const cuttingPrice = parseFloat(item.cutting_price) * quantity
      pricingData.total_cutting_price += cuttingPrice

      if (item.customer_price) {
        const customerPrice = parseFloat(item.customer_price) * quantity
        pricingData.total_customer_price += customerPrice
      }

      if (item.production_time_hours) {
        pricingData.total_production_time += parseFloat(item.production_time_hours) * quantity
      }

      pricingData.line_items.push({
        id: item.id,
        cutting_price: item.cutting_price,
        customer_price: item.customer_price,
        production_time_hours: item.production_time_hours,
        quantity: quantity,
        total_cutting_price: cuttingPrice,
        total_customer_price: item.customer_price ? parseFloat(item.customer_price) * quantity : null
      })
    }

    // Calculate profit margin
    if (pricingData.total_customer_price > 0 && pricingData.total_cutting_price > 0) {
      pricingData.margin_percentage = Math.round(
        ((pricingData.total_customer_price - pricingData.total_cutting_price) / pricingData.total_cutting_price) * 100
      )
    }

    // Update quote totals (server-side calculation enforces correctness)
    const { data: updatedQuote, error: updateError } = await supabase
      .from('quotes')
      .update({
        total_cutting_price: pricingData.total_cutting_price,
        total_customer_price: pricingData.total_customer_price > 0 ? pricingData.total_customer_price : null,
        production_time_hours: pricingData.total_production_time > 0 ? pricingData.total_production_time : null,
        updated_at: pricingData.calculated_at
      })
      .eq('id', quoteId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating quote totals:', updateError)
      return NextResponse.json(
        { error: 'Fout bij bijwerken offerte totalen', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      quote: updatedQuote,
      pricing: pricingData
    })

  } catch (error) {
    console.error('Unexpected error in POST /api/quotes/[id]/calculate-pricing:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}