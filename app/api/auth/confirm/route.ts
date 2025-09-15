import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'email' | 'signup' | 'recovery' | null
  const next = searchParams.get('next') ?? '/'

  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')
  redirectTo.searchParams.delete('next')

  // Missing required parameters
  if (!token_hash || !type) {
    redirectTo.pathname = '/auth/verification-error'
    redirectTo.searchParams.set('error', 'invalid_link')
    redirectTo.searchParams.set('message', 'Ongeldige verificatielink. Probeer opnieuw te registreren.')
    return NextResponse.redirect(redirectTo)
  }

  const supabase = await createClient()

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    // Verification successful
    if (!error && data.user) {
      if (type === 'recovery') {
        // Password reset verification - redirect to update password page
        redirectTo.pathname = '/auth/update-password'
        redirectTo.searchParams.set('access_token', data.session?.access_token || '')
        redirectTo.searchParams.set('refresh_token', data.session?.refresh_token || '')
        return NextResponse.redirect(redirectTo)
      } else {
        // Email/signup verification - redirect to login with success message
        redirectTo.pathname = '/auth'
        redirectTo.searchParams.set('verified', 'true')
        redirectTo.searchParams.set('message', 'E-mail succesvol bevestigd! U kunt nu inloggen.')
        return NextResponse.redirect(redirectTo)
      }
    }

    // Handle specific error cases
    let errorType = 'verification_failed'
    let errorMessage = 'Verificatie mislukt. Probeer opnieuw.'

    if (error) {
      if (error.message.includes('expired') || error.message.includes('invalid')) {
        errorType = type === 'recovery' ? 'recovery_expired' : 'verification_expired'
        errorMessage = type === 'recovery'
          ? 'Wachtwoord reset link is verlopen. Vraag een nieuwe link aan.'
          : 'Verificatielink is verlopen. Probeer opnieuw te registreren.'
      } else if (error.message.includes('already confirmed')) {
        // User already verified - redirect to login
        redirectTo.pathname = '/auth'
        redirectTo.searchParams.set('message', 'E-mail is al bevestigd. U kunt inloggen.')
        return NextResponse.redirect(redirectTo)
      }
    }

    redirectTo.pathname = '/auth/verification-error'
    redirectTo.searchParams.set('error', errorType)
    redirectTo.searchParams.set('message', errorMessage)
    return NextResponse.redirect(redirectTo)

  } catch (error) {
    console.error('Verification error:', error)

    redirectTo.pathname = '/auth/verification-error'
    redirectTo.searchParams.set('error', 'server_error')
    redirectTo.searchParams.set('message', 'Serverfout bij verificatie. Probeer het later opnieuw.')
    return NextResponse.redirect(redirectTo)
  }
}