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

    const searchParams = request.nextUrl.searchParams
    const filePath = searchParams.get('path')
    const bucket = searchParams.get('bucket')
    const quoteId = searchParams.get('quoteId')

    if (!filePath || !bucket || !quoteId) {
      return NextResponse.json(
        { error: 'File path, bucket en quoteId zijn verplicht' },
        { status: 400 }
      )
    }

    const quoteIdInt = parseInt(quoteId)
    if (isNaN(quoteIdInt)) {
      return NextResponse.json(
        { error: 'Ongeldig quote ID' },
        { status: 400 }
      )
    }

    // Verify access to the quote based on user role
    let hasAccess = false

    if (profile.role === 'admin') {
      // Admins can access all files
      hasAccess = true
    } else if (profile.role === 'customer') {
      // Customers can only access their own quote files
      const { data: quote } = await supabase
        .from('quotes')
        .select('customer_id')
        .eq('id', quoteIdInt)
        .single()

      if (quote && quote.customer_id === user.id) {
        hasAccess = true
      }
    } else if (profile.role === 'operator') {
      // Operators can access files from quotes assigned to them
      const { data: quote } = await supabase
        .from('quotes')
        .select('operator_id')
        .eq('id', quoteIdInt)
        .single()

      if (quote && quote.operator_id === user.id) {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Geen toegang tot dit bestand' },
        { status: 403 }
      )
    }

    // Generate signed URL for secure download (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError)
      return NextResponse.json(
        { error: 'Fout bij maken download link', details: signedUrlError.message },
        { status: 500 }
      )
    }

    // Add audit log for file access
    await supabase
      .from('audit_log')
      .insert({
        table_name: 'file_access',
        record_id: `${bucket}/${filePath}`,
        action: 'file_downloaded',
        user_id: user.id,
        new_data: {
          quote_id: quoteIdInt,
          bucket,
          file_path: filePath,
          user_role: profile.role
        }
      })

    return NextResponse.json({
      download_url: signedUrlData.signedUrl,
      expires_in: 3600
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/files/download:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}

// Helper endpoint to get file info without downloading
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

    const { quote_id }: { quote_id: number } = await request.json()

    if (!quote_id) {
      return NextResponse.json(
        { error: 'Quote ID vereist' },
        { status: 400 }
      )
    }

    // Get user profile for access control
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

    // Get quote with file information
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        id,
        quote_number,
        customer_id,
        operator_id,
        quote_pdf_url,
        invoice_pdf_url,
        line_items (
          id,
          dxf_file_url,
          dxf_file_name,
          pdf_file_url,
          pdf_file_name
        )
      `)
      .eq('id', quote_id)
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

    // Access control check
    let hasAccess = false
    if (profile.role === 'admin') {
      hasAccess = true
    } else if (profile.role === 'customer' && quote.customer_id === user.id) {
      hasAccess = true
    } else if (profile.role === 'operator' && quote.operator_id === user.id) {
      hasAccess = true
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Geen toegang tot deze offerte bestanden' },
        { status: 403 }
      )
    }

    // Compile file list based on user role
    const files: any[] = []

    // Line item files (DXF/PDF technical drawings)
    if (quote.line_items) {
      quote.line_items.forEach((item: any) => {
        if (item.dxf_file_url) {
          files.push({
            type: 'dxf',
            name: item.dxf_file_name,
            line_item_id: item.id,
            bucket: 'dxf-files',
            accessible: true
          })
        }
        if (item.pdf_file_url) {
          files.push({
            type: 'pdf_technical',
            name: item.pdf_file_name,
            line_item_id: item.id,
            bucket: 'pdf-files',
            accessible: true
          })
        }
      })
    }

    // Quote PDF (only for customers and admins)
    if (quote.quote_pdf_url && (profile.role === 'customer' || profile.role === 'admin')) {
      files.push({
        type: 'quote_pdf',
        name: `Quote_${quote.quote_number}.pdf`,
        bucket: 'quote-pdfs',
        accessible: true
      })
    }

    // Invoice PDF (only for customers and admins)
    if (quote.invoice_pdf_url && (profile.role === 'customer' || profile.role === 'admin')) {
      files.push({
        type: 'invoice_pdf',
        name: `Invoice_${quote.quote_number}.pdf`,
        bucket: 'invoice-pdfs',
        accessible: true
      })
    }

    return NextResponse.json({
      quote_id: quote.id,
      quote_number: quote.quote_number,
      files,
      user_role: profile.role
    })

  } catch (error) {
    console.error('Unexpected error in POST /api/files/download:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}