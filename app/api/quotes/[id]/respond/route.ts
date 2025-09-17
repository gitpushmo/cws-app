import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ResponseAction = 'accept' | 'decline' | 'request_revision'

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

    // Only customers can respond to quotes
    if (!profile || profile.role !== 'customer') {
      return NextResponse.json(
        { error: 'Alleen klanten kunnen reageren op offertes' },
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

    const { action, message }: { action: ResponseAction; message?: string } = await request.json()
    if (!action || !['accept', 'decline', 'request_revision'].includes(action)) {
      return NextResponse.json(
        { error: 'Geldige actie vereist: accept, decline, of request_revision' },
        { status: 400 }
      )
    }

    // Get current quote - ensure customer owns it and it's in 'sent' status
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('id, status, customer_id, quote_number, total_customer_price')
      .eq('id', quoteId)
      .eq('customer_id', user.id) // RLS should handle this, but explicit check
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Offerte niet gevonden of geen toegang' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Fout bij ophalen offerte' },
        { status: 500 }
      )
    }

    // Only allow responses to 'sent' quotes
    if (quote.status !== 'sent') {
      return NextResponse.json(
        { error: `Kan alleen reageren op verzonden offertes. Huidige status: ${quote.status}` },
        { status: 400 }
      )
    }

    // Handle different response actions
    if (action === 'accept') {
      // Update quote status to accepted
      const { data: updatedQuote, error: updateError } = await supabase
        .from('quotes')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId)
        .select()
        .single()

      if (updateError) {
        console.error('Error accepting quote:', updateError)
        return NextResponse.json(
          { error: 'Fout bij accepteren offerte' },
          { status: 500 }
        )
      }

      // Add notification to email queue for admin
      await supabase
        .from('email_queue')
        .insert({
          to_email: 'admin@company.com', // TODO: Get from env or admin settings
          template_id: 'quote_accepted',
          template_data: {
            quote_number: quote.quote_number,
            customer_name: profile.name,
            total_amount: quote.total_customer_price
          }
        })

      // TODO: Create payment link here
      // For now, return success with payment_required flag
      return NextResponse.json({
        message: 'Offerte geaccepteerd',
        quote: updatedQuote,
        payment_required: true,
        payment_amount: quote.total_customer_price
      })

    } else if (action === 'decline') {
      // Update quote status to declined
      const { data: updatedQuote, error: updateError } = await supabase
        .from('quotes')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId)
        .select()
        .single()

      if (updateError) {
        console.error('Error declining quote:', updateError)
        return NextResponse.json(
          { error: 'Fout bij afwijzen offerte' },
          { status: 500 }
        )
      }

      // Add customer comment if message provided
      if (message) {
        await supabase
          .from('comments')
          .insert({
            quote_id: quoteId,
            author_id: user.id,
            content: `Klant heeft offerte afgewezen: ${message}`,
            visibility: 'public'
          })
      }

      return NextResponse.json({
        message: 'Offerte afgewezen',
        quote: updatedQuote
      })

    } else if (action === 'request_revision') {
      if (!message) {
        return NextResponse.json(
          { error: 'Bericht vereist bij revisie verzoek' },
          { status: 400 }
        )
      }

      // Add customer comment with revision request
      const { error: commentError } = await supabase
        .from('comments')
        .insert({
          quote_id: quoteId,
          author_id: user.id,
          content: `Revisie verzoek: ${message}`,
          visibility: 'public'
        })

      if (commentError) {
        console.error('Error adding revision comment:', commentError)
        return NextResponse.json(
          { error: 'Fout bij toevoegen revisie verzoek' },
          { status: 500 }
        )
      }

      // Add notification to email queue for admin
      await supabase
        .from('email_queue')
        .insert({
          to_email: 'admin@company.com', // TODO: Get from env or admin settings
          template_id: 'revision_requested',
          template_data: {
            quote_number: quote.quote_number,
            customer_message: message
          }
        })

      return NextResponse.json({
        message: 'Revisie verzoek verstuurd naar admin',
        revision_message: message
      })
    }

  } catch (error) {
    console.error('Unexpected error in POST /api/quotes/[id]/respond:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}