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
        { error: 'Alleen operators en admins kunnen cutting prices instellen' },
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

    const { cutting_price, production_time_hours } = await request.json()

    if (cutting_price === undefined || cutting_price === null) {
      return NextResponse.json(
        { error: 'Cutting price is verplicht' },
        { status: 400 }
      )
    }

    if (cutting_price < 0) {
      return NextResponse.json(
        { error: 'Cutting price kan niet negatief zijn' },
        { status: 400 }
      )
    }

    if (production_time_hours !== undefined && production_time_hours < 0) {
      return NextResponse.json(
        { error: 'Productietijd kan niet negatief zijn' },
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
      .select('id, status, operator_id')
      .eq('id', lineItem.quote_id)
      .single()

    if (quoteError) {
      return NextResponse.json(
        { error: 'Offerte niet gevonden of geen toegang' },
        { status: 404 }
      )
    }

    // Role-based business logic
    if (profile.role === 'operator') {
      // Operators can only set cutting prices on quotes they're assigned to
      if (quote.operator_id !== user.id) {
        return NextResponse.json(
          { error: 'Je kunt alleen cutting prices instellen voor toegewezen offertes' },
          { status: 403 }
        )
      }

      // Operators can only set cutting prices in certain statuses
      const allowedStatuses = ['needs_attention', 'ready_for_pricing']
      if (!allowedStatuses.includes(quote.status)) {
        return NextResponse.json(
          { error: `Cutting price kan niet worden ingesteld voor offerte met status: ${quote.status}` },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: any = {
      cutting_price: parseFloat(cutting_price),
      updated_at: new Date().toISOString()
    }

    if (production_time_hours !== undefined) {
      updateData.production_time_hours = parseFloat(production_time_hours)
    }

    // Update line item
    const { data: updatedLineItem, error: updateError } = await supabase
      .from('line_items')
      .update(updateData)
      .eq('id', lineItemId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating line item cutting price:', updateError)
      return NextResponse.json(
        { error: 'Fout bij bijwerken cutting price', details: updateError.message },
        { status: 500 }
      )
    }

    // After updating line items, recalculate quote totals
    await recalculateQuoteTotals(supabase, lineItem.quote_id)

    return NextResponse.json(updatedLineItem)

  } catch (error) {
    console.error('Unexpected error in PUT /api/line-items/[id]/cutting-price:', error)
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