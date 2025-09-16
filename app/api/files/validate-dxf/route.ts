import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role === 'customer') {
      return NextResponse.json(
        { error: 'Alleen operators en admins kunnen DXF bestanden valideren' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Geen bestand ontvangen' },
        { status: 400 }
      )
    }

    // Basic file validation
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Bestand is te groot (max 10MB)' },
        { status: 400 }
      )
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (fileExtension !== 'dxf') {
      return NextResponse.json(
        { error: 'Alleen DXF bestanden zijn toegestaan' },
        { status: 400 }
      )
    }

    // Read file content for validation
    const arrayBuffer = await file.arrayBuffer()
    const fileContent = new TextDecoder('utf-8').decode(arrayBuffer)

    // DXF validation rules
    const validationResult = {
      is_valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      metadata: {
        file_size_bytes: file.size,
        file_name: file.name,
        analyzed_at: new Date().toISOString()
      }
    }

    // Basic DXF structure validation
    if (!fileContent.includes('0\nSECTION')) {
      validationResult.is_valid = false
      validationResult.errors.push('Geen geldige DXF sectie headers gevonden')
    }

    if (!fileContent.includes('ENTITIES') && !fileContent.includes('BLOCKS')) {
      validationResult.warnings.push('Geen entities of blocks gevonden - bestand mogelijk leeg')
    }

    // Check for AutoCAD version markers
    const versionMatch = fileContent.match(/\$ACADVER[\s\S]*?1\n([A-Z0-9_]+)/i)
    if (versionMatch) {
      validationResult.metadata = {
        ...validationResult.metadata,
        autocad_version: versionMatch[1]
      }
    }

    // Check file encoding - DXF should be ASCII or UTF-8
    const hasInvalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(fileContent)
    if (hasInvalidChars) {
      validationResult.warnings.push('Bestand bevat mogelijk ongeldige karakters')
    }

    // Size-based warnings
    if (file.size < 1024) { // Less than 1KB
      validationResult.warnings.push('Bestand is erg klein voor een DXF bestand')
    }

    if (file.size > 5 * 1024 * 1024) { // Greater than 5MB
      validationResult.warnings.push('Bestand is erg groot - dit kan processing vertragen')
    }

    // SECURITY CHECK: Look for potentially malicious content
    const suspiciousPatterns = [
      /<script[\s\S]*?<\/script>/i,
      /javascript:/i,
      /vbscript:/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ]

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(fileContent)) {
        validationResult.is_valid = false
        validationResult.errors.push('Verdacht content gedetecteerd in DXF bestand')
        break
      }
    }

    // CRITICAL: Advanced DXF parsing not implemented
    // This basic validation catches obvious issues but doesn't do full DXF parsing
    // For production, you'd need a proper DXF parsing library

    if (validationResult.errors.length === 0 && validationResult.warnings.length === 0) {
      validationResult.warnings.push('Basis validatie geslaagd - volledige DXF parsing niet geïmplementeerd')
    }

    return NextResponse.json(validationResult)

  } catch (error) {
    console.error('Unexpected error in POST /api/files/validate-dxf:', error)

    // If it's a text decoding error, the file is likely binary or corrupted
    if (error instanceof TypeError && error.message.includes('decode')) {
      return NextResponse.json({
        is_valid: false,
        errors: ['Bestand kan niet gelezen worden - mogelijk corrupt of niet-standaard encoding'],
        warnings: [],
        metadata: {
          analyzed_at: new Date().toISOString(),
          error: 'decode_error'
        }
      })
    }

    return NextResponse.json(
      { error: 'Interne serverfout bij validatie' },
      { status: 500 }
    )
  }
}