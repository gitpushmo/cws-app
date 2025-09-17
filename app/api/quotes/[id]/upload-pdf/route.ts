import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_PDF_TYPES = ['application/pdf']

type PdfType = 'quote' | 'invoice'

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

    // Only admins can upload quote/invoice PDFs
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Alleen admins kunnen quote/invoice PDFs uploaden' },
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const pdfType = formData.get('type') as PdfType

    if (!file) {
      return NextResponse.json(
        { error: 'Geen bestand gevonden' },
        { status: 400 }
      )
    }

    if (!pdfType || !['quote', 'invoice'].includes(pdfType)) {
      return NextResponse.json(
        { error: 'PDF type moet quote of invoice zijn' },
        { status: 400 }
      )
    }

    // Verify quote exists and get current status
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, status, quote_number')
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

    // Business rule validation
    if (pdfType === 'quote' && quote.status !== 'ready_for_pricing') {
      return NextResponse.json(
        { error: 'Quote PDF kan alleen worden geüpload voor ready_for_pricing offertes' },
        { status: 400 }
      )
    }

    if (pdfType === 'invoice' && quote.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Invoice PDF kan alleen worden geüpload voor geaccepteerde offertes' },
        { status: 400 }
      )
    }

    // File validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Bestand te groot (max 10MB)' },
        { status: 400 }
      )
    }

    if (!ALLOWED_PDF_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Alleen PDF bestanden toegestaan' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = 'pdf'
    const fileName = `${pdfType}_${quote.quote_number}_${timestamp}.${fileExtension}`
    const filePath = `${quoteId}/${fileName}`

    // Upload to appropriate bucket
    const bucket = pdfType === 'quote' ? 'quote-pdfs' : 'invoice-pdfs'

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Allow overwriting existing files
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Fout bij uploaden bestand', details: uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    // Update quote with PDF URL
    const updateField = pdfType === 'quote' ? 'quote_pdf_url' : 'invoice_pdf_url'
    const { data: updatedQuote, error: updateError } = await supabase
      .from('quotes')
      .update({
        [updateField]: urlData.publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating quote with PDF URL:', updateError)
      return NextResponse.json(
        { error: 'Fout bij bijwerken offerte', details: updateError.message },
        { status: 500 }
      )
    }

    // Add audit log entry
    await supabase
      .from('audit_log')
      .insert({
        table_name: 'quotes',
        record_id: quoteId.toString(),
        action: `${pdfType}_pdf_uploaded`,
        user_id: user.id,
        new_data: { [updateField]: urlData.publicUrl }
      })

    return NextResponse.json({
      message: `${pdfType === 'quote' ? 'Quote' : 'Invoice'} PDF succesvol geüpload`,
      pdf_url: urlData.publicUrl,
      pdf_type: pdfType,
      quote: updatedQuote
    })

  } catch (error) {
    console.error('Unexpected error in POST /api/quotes/[id]/upload-pdf:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}