import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = {
  'dxf': ['application/dxf', 'application/octet-stream', 'text/plain'],
  'pdf': ['application/pdf']
}

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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const quoteId = formData.get('quoteId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'Geen bestand gevonden' },
        { status: 400 }
      )
    }

    if (!quoteId) {
      return NextResponse.json(
        { error: 'Quote ID is verplicht' },
        { status: 400 }
      )
    }

    // Verify user owns the quote
    const { data: quote } = await supabase
      .from('quotes')
      .select('id, customer_id')
      .eq('id', quoteId)
      .single()

    if (!quote || quote.customer_id !== user.id) {
      return NextResponse.json(
        { error: 'Geen toegang tot deze offerte' },
        { status: 403 }
      )
    }

    // File size validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Bestand te groot (max 10MB)' },
        { status: 400 }
      )
    }

    // File type validation
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const isValidType = fileExtension === 'dxf' || fileExtension === 'pdf'

    if (!isValidType) {
      return NextResponse.json(
        { error: 'Alleen DXF en PDF bestanden toegestaan' },
        { status: 400 }
      )
    }

    // Determine bucket
    const bucket = fileExtension === 'dxf' ? 'dxf-files' : 'pdf-files'

    // Generate unique filename
    const timestamp = Date.now()
    const fileName = `${file.name.replace(/\.[^/.]+$/, '')}_${timestamp}.${fileExtension}`
    const filePath = `${quoteId}/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Fout bij uploaden bestand', details: uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL for storage (we'll use signed URLs for access)
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    // Create line_item record for DXF files
    if (fileExtension === 'dxf') {
      const { error: lineItemError } = await supabase
        .from('line_items')
        .insert({
          quote_id: parseInt(quoteId),
          dxf_file_url: urlData.publicUrl,
          dxf_file_name: file.name,
          quantity: 1
        })

      if (lineItemError) {
        console.error('Error creating line item:', lineItemError)
        // Don't fail the upload, just log the error
      }
    }

    return NextResponse.json({
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_path: filePath
    })

  } catch (error) {
    console.error('Unexpected error in POST /api/files/upload:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}