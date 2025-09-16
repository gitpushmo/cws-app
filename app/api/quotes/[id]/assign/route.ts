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

    // Only admins can assign operators
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Alleen admins kunnen operators toewijzen' },
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

    const { operator_id } = await request.json()

    // If operator_id is null, we're unassigning
    if (operator_id !== null) {
      if (!operator_id) {
        return NextResponse.json(
          { error: 'Operator ID is verplicht' },
          { status: 400 }
        )
      }

      // Verify operator exists and has operator role
      const { data: operator, error: operatorError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', operator_id)
        .single()

      if (operatorError || !operator || operator.role !== 'operator') {
        return NextResponse.json(
          { error: 'Ongeldige operator ID' },
          { status: 400 }
        )
      }
    }

    // Get current quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, status, operator_id')
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

    // Only allow assignment on pending quotes or re-assignment on any active quote
    const allowedStatuses = ['pending', 'needs_attention', 'ready_for_pricing']
    if (!allowedStatuses.includes(quote.status)) {
      return NextResponse.json(
        { error: `Operator kan niet worden toegewezen voor offerte met status: ${quote.status}` },
        { status: 400 }
      )
    }

    // Update quote with operator assignment
    const { data: updatedQuote, error: updateError } = await supabase
      .from('quotes')
      .update({
        operator_id: operator_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId)
      .select(`
        id,
        quote_number,
        status,
        operator_id,
        profiles:operator_id (
          id,
          name,
          email
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating quote operator assignment:', updateError)
      return NextResponse.json(
        { error: 'Fout bij toewijzen operator', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedQuote)

  } catch (error) {
    console.error('Unexpected error in POST /api/quotes/[id]/assign:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}