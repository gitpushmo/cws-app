import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Valid status transitions - keep it simple and enforce business rules
const VALID_TRANSITIONS: Record<string, string[]> = {
  'pending': ['needs_attention'],
  'needs_attention': ['ready_for_pricing'],
  'ready_for_pricing': ['sent'],
  'sent': ['accepted', 'declined', 'expired'],
  'accepted': ['done'],
  'declined': [],
  'expired': [],
  'done': []
}

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

    if (!profile) {
      return NextResponse.json(
        { error: 'Gebruikersprofiel niet gevonden' },
        { status: 404 }
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

    const { status: newStatus } = await request.json()
    if (!newStatus) {
      return NextResponse.json(
        { error: 'Status is verplicht' },
        { status: 400 }
      )
    }

    // Get current quote
    const { data: currentQuote, error: fetchError } = await supabase
      .from('quotes')
      .select('status, customer_id, operator_id')
      .eq('id', quoteId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
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

    // Role-based access control for status updates
    if (profile.role === 'customer') {
      return NextResponse.json(
        { error: 'Klanten kunnen status niet wijzigen' },
        { status: 403 }
      )
    }

    if (profile.role === 'operator') {
      // Operators can only move from pending -> needs_attention -> ready_for_pricing
      const allowedForOperator = ['needs_attention', 'ready_for_pricing']
      if (!allowedForOperator.includes(newStatus)) {
        return NextResponse.json(
          { error: 'Operators kunnen alleen status wijzigen naar needs_attention of ready_for_pricing' },
          { status: 403 }
        )
      }
    }

    // Admin can change any status (but still validate transitions)

    // Validate status transition
    const validNextStatuses = VALID_TRANSITIONS[currentQuote.status] || []
    if (!validNextStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: `Ongeldige status overgang van ${currentQuote.status} naar ${newStatus}` },
        { status: 400 }
      )
    }

    // First, assign operator if needed (separate transaction to avoid RLS conflicts)
    if (profile.role === 'operator' && !currentQuote.operator_id) {
      const { error: assignError } = await supabase
        .from('quotes')
        .update({
          operator_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId)

      if (assignError) {
        console.error('Error assigning operator:', assignError)
        return NextResponse.json(
          { error: 'Fout bij toewijzen operator', details: assignError.message },
          { status: 500 }
        )
      }
    }

    // Now update quote status
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    // Set timestamps for specific status changes
    if (newStatus === 'sent') {
      updateData.sent_at = new Date().toISOString()
    } else if (newStatus === 'accepted') {
      updateData.accepted_at = new Date().toISOString()
    } else if (newStatus === 'declined') {
      updateData.declined_at = new Date().toISOString()
    }

    const { data: updatedQuote, error: updateError } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', quoteId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating quote status:', updateError)
      return NextResponse.json(
        { error: 'Fout bij bijwerken status', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedQuote)

  } catch (error) {
    console.error('Unexpected error in PUT /api/quotes/[id]/status:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}