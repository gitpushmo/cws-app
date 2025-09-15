import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { mapAuthError, isValidEmail, isEmailVerified, formatUserResponse } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json(
      { error: 'E-mail en wachtwoord zijn verplicht' },
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

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return NextResponse.json(
      { error: mapAuthError(error) },
      { status: 401 }
    )
  }

  if (data.user) {
    // Check if user has confirmed their email
    if (!isEmailVerified(data.user)) {
      return NextResponse.json(
        { error: 'E-mail nog niet bevestigd. Controleer uw mailbox en klik op de verificatielink.' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Succesvol ingelogd',
      user: formatUserResponse(data.user)
    })
  }

  return NextResponse.json(
    { error: 'Onbekende fout bij inloggen' },
    { status: 500 }
  )
}