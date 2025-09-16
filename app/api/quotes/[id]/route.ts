import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
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

    const resolvedParams = await params
    const quoteId = parseInt(resolvedParams.id)
    if (isNaN(quoteId)) {
      return NextResponse.json(
        { error: 'Ongeldig offerte ID' },
        { status: 400 }
      )
    }

    // Get quote with line_items - RLS will handle access control
    const { data: quote, error } = await supabase
      .from('quotes')
      .select(`
        id,
        quote_number,
        status,
        notes,
        deadline,
        shipping_address,
        created_at,
        updated_at,
        customer_id,
        operator_id,
        line_items (
          id,
          dxf_file_url,
          dxf_file_name,
          pdf_file_url,
          pdf_file_name,
          quantity
        )
      `)
      .eq('id', quoteId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Offerte niet gevonden' },
          { status: 404 }
        )
      }
      console.error('Error fetching quote:', error)
      return NextResponse.json(
        { error: 'Fout bij ophalen offerte', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(quote)

  } catch (error) {
    console.error('Unexpected error in GET /api/quotes/[id]:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}