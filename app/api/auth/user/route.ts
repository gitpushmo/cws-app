import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { mapAuthError, formatUserResponse, isEmailVerified } from '@/lib/auth-utils'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json(
      { error: 'Niet ingelogd' },
      { status: 401 }
    )
  }

  // Check if email is verified
  if (!isEmailVerified(user)) {
    return NextResponse.json(
      { error: 'E-mail nog niet bevestigd. Controleer uw mailbox en klik op de verificatielink.' },
      { status: 401 }
    )
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return NextResponse.json(
      { error: 'Gebruikersprofiel niet gevonden' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    user: formatUserResponse(user, profile),
  })
}