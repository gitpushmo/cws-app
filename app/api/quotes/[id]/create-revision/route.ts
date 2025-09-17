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

    // Only admins can create revisions
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Alleen admins kunnen revisies maken' },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const originalQuoteId = parseInt(resolvedParams.id)
    if (isNaN(originalQuoteId)) {
      return NextResponse.json(
        { error: 'Ongeldig offerte ID' },
        { status: 400 }
      )
    }

    const { notes }: { notes?: string } = await request.json()

    // Get original quote with all its data
    const { data: originalQuote, error: fetchError } = await supabase
      .from('quotes')
      .select(`
        *,
        line_items (*)
      `)
      .eq('id', originalQuoteId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Originele offerte niet gevonden' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Fout bij ophalen originele offerte' },
        { status: 500 }
      )
    }

    // Determine the new revision number
    // If this is the first revision of an original quote, use R1
    // If this is a revision of a revision, increment the revision number
    let baseQuoteNumber: string
    let newRevisionNumber: number

    if (originalQuote.revision_number === 0) {
      // This is an original quote, create R1
      baseQuoteNumber = originalQuote.quote_number
      newRevisionNumber = 1
    } else {
      // This is already a revision, increment
      // Extract base quote number (remove -RX suffix)
      baseQuoteNumber = originalQuote.quote_number.split('-R')[0]
      newRevisionNumber = originalQuote.revision_number + 1
    }

    const newQuoteNumber = `${baseQuoteNumber}-R${newRevisionNumber}`

    // Create the revision quote
    const { data: revisionQuote, error: createError } = await supabase
      .from('quotes')
      .insert({
        quote_number: newQuoteNumber,
        revision_number: newRevisionNumber,
        parent_quote_id: originalQuote.revision_number === 0 ? originalQuoteId : originalQuote.parent_quote_id,
        customer_id: originalQuote.customer_id,
        operator_id: originalQuote.operator_id,
        status: 'ready_for_pricing', // Start at ready_for_pricing since operator already reviewed
        notes: notes || `Revisie van ${originalQuote.quote_number}`,
        deadline: originalQuote.deadline,
        shipping_address: originalQuote.shipping_address,
        total_cutting_price: originalQuote.total_cutting_price,
        production_time_hours: originalQuote.production_time_hours
        // Don't copy customer prices - admin will set new ones
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating revision quote:', createError)
      return NextResponse.json(
        { error: 'Fout bij maken revisie', details: createError.message },
        { status: 500 }
      )
    }

    // Copy line items from original quote
    if (originalQuote.line_items && originalQuote.line_items.length > 0) {
      const lineItemsToInsert = originalQuote.line_items.map((item: any) => ({
        quote_id: revisionQuote.id,
        dxf_file_url: item.dxf_file_url,
        dxf_file_name: item.dxf_file_name,
        pdf_file_url: item.pdf_file_url,
        pdf_file_name: item.pdf_file_name,
        quantity: item.quantity,
        material_id: item.material_id,
        cutting_price: item.cutting_price,
        production_time_hours: item.production_time_hours,
        part_dimensions: item.part_dimensions
        // Don't copy customer_price - admin will set new ones
      }))

      const { error: lineItemsError } = await supabase
        .from('line_items')
        .insert(lineItemsToInsert)

      if (lineItemsError) {
        console.error('Error copying line items:', lineItemsError)
        // Don't fail the revision creation, but log the error
      }
    }

    // Add comment to original quote indicating revision was created
    await supabase
      .from('comments')
      .insert({
        quote_id: originalQuoteId,
        author_id: user.id,
        content: `Revisie ${newQuoteNumber} aangemaakt${notes ? `: ${notes}` : ''}`,
        visibility: 'internal'
      })

    // Add comment to new revision explaining it's a revision
    await supabase
      .from('comments')
      .insert({
        quote_id: revisionQuote.id,
        author_id: user.id,
        content: `Revisie van ${originalQuote.quote_number}${notes ? `: ${notes}` : ''}`,
        visibility: 'internal'
      })

    // Add audit log entry
    await supabase
      .from('audit_log')
      .insert({
        table_name: 'quotes',
        record_id: revisionQuote.id.toString(),
        action: 'revision_created',
        user_id: user.id,
        new_data: {
          original_quote_id: originalQuoteId,
          revision_number: newRevisionNumber,
          quote_number: newQuoteNumber
        }
      })

    // Get the complete revision with line items
    const { data: completeRevision, error: completeError } = await supabase
      .from('quotes')
      .select(`
        *,
        line_items (*),
        profiles:customer_id (name, email)
      `)
      .eq('id', revisionQuote.id)
      .single()

    if (completeError) {
      console.error('Error fetching complete revision:', completeError)
      // Return basic revision data if complete fetch fails
      return NextResponse.json({
        message: 'Revisie succesvol aangemaakt',
        revision: revisionQuote
      })
    }

    return NextResponse.json({
      message: 'Revisie succesvol aangemaakt',
      revision: completeRevision,
      original_quote_id: originalQuoteId
    })

  } catch (error) {
    console.error('Unexpected error in POST /api/quotes/[id]/create-revision:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}