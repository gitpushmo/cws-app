import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { mapAuthError, isValidEmail, isValidPassword, formatUserResponse } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  const { email, password, name, phone, company_name, invoice_address } = await request.json()

  // Validate required fields
  if (!email || !password || !name || !phone || !invoice_address) {
    return NextResponse.json(
      { error: 'Alle verplichte velden moeten worden ingevuld' },
      { status: 400 }
    )
  }

  // Validate email format
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: 'Ongeldig e-mailadres' },
      { status: 400 }
    )
  }

  // Validate password
  const passwordValidation = isValidPassword(password)
  if (!passwordValidation.valid) {
    return NextResponse.json(
      { error: passwordValidation.message },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Proceed with signup - Supabase will handle duplicate detection
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/confirm`,
      data: {
        name,
        phone,
        company_name: company_name || '',
        invoice_address
      }
    }
  })

  if (error) {
    return NextResponse.json(
      { error: mapAuthError(error) },
      { status: 400 }
    )
  }

  if (data.user) {
    return NextResponse.json({
      success: true,
      message: 'Registratie succesvol! Controleer uw e-mail voor de verificatielink.',
      user: formatUserResponse(data.user)
    })
  }

  return NextResponse.json(
    { error: 'Onbekende fout bij registratie' },
    { status: 500 }
  )
}