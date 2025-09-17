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

    // Only admins can send quotes
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Alleen admins kunnen offertes versturen' },
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

    // Get quote with customer details
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        id,
        quote_number,
        status,
        total_customer_price,
        production_time_hours,
        notes,
        deadline,
        shipping_address,
        created_at,
        profiles:customer_id (
          name,
          email,
          company_name
        )
      `)
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

    // Only allow sending quotes that are ready for pricing with complete pricing
    if (quote.status !== 'ready_for_pricing') {
      return NextResponse.json(
        { error: `Offerte kan alleen worden verstuurd met status ready_for_pricing` },
        { status: 400 }
      )
    }

    if (!quote.total_customer_price || quote.total_customer_price <= 0) {
      return NextResponse.json(
        { error: 'Offerte moet een geldige customer price hebben voordat deze kan worden verstuurd' },
        { status: 400 }
      )
    }

    // Get line items with materials for PDF generation
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('line_items')
      .select(`
        id,
        dxf_file_name,
        pdf_file_name,
        customer_price,
        quantity,
        production_time_hours,
        materials:material_id (
          name,
          thickness_mm
        )
      `)
      .eq('quote_id', quoteId)

    if (lineItemsError) {
      return NextResponse.json(
        { error: 'Fout bij ophalen line items' },
        { status: 500 }
      )
    }

    // Check if quote PDF is uploaded (required for sending)
    if (!quote.quote_pdf_url) {
      return NextResponse.json(
        { error: 'Quote PDF moet worden geüpload voordat offerte kan worden verstuurd. Gebruik /api/quotes/[id]/upload-pdf endpoint.' },
        { status: 400 }
      )
    }

    // Update quote status to sent
    const { data: updatedQuote, error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating quote status to sent:', updateError)
      return NextResponse.json(
        { error: 'Fout bij bijwerken offerte status', details: updateError.message },
        { status: 500 }
      )
    }

    // Queue email notification to customer
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/queue-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          template_id: 'quote_sent',
          quote_id: quoteId
        })
      })
    } catch (emailError) {
      console.warn('Email notification failed, but quote sending succeeded:', emailError)
      // Don't fail the operation if email fails
    }

    // Add audit log entry
    await supabase
      .from('audit_log')
      .insert({
        table_name: 'quotes',
        record_id: quoteId.toString(),
        action: 'quote_sent',
        user_id: user.id,
        new_data: {
          sent_at: updatedQuote.sent_at,
          total_customer_price: quote.total_customer_price,
          quote_pdf_url: quote.quote_pdf_url
        }
      })

    return NextResponse.json({
      message: 'Offerte succesvol verstuurd naar klant',
      quote: updatedQuote,
      quote_pdf_url: quote.quote_pdf_url
    })

  } catch (error) {
    console.error('Unexpected error in POST /api/quotes/[id]/send-quote:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}