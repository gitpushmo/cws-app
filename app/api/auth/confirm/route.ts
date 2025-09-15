import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'signup' | 'recovery' | 'email_change' | null
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
    redirectTo.searchParams.set('message', 'Ongeldige verificatielink. Ontbrekende parameters.')
    return NextResponse.redirect(redirectTo)
  }

  // Validate PKCE type parameter
  const validTypes = ['signup', 'recovery', 'email_change']
  if (!validTypes.includes(type)) {
    redirectTo.pathname = '/auth/verification-error'
    redirectTo.searchParams.set('error', 'invalid_type')
    redirectTo.searchParams.set('message', 'Ongeldig verificatietype. Controleer de link uit uw e-mail.')
    return NextResponse.redirect(redirectTo)
  }

  const supabase = await createClient()

  // Log the verification attempt for debugging
  console.log(`PKCE verification attempt - type: ${type}, token_hash length: ${token_hash.length}`)

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    console.log(`PKCE verification result - success: ${!!data.user}, error: ${error?.message || 'none'}`)

    // Verification successful
    if (!error && data.user && data.session) {
      if (type === 'recovery') {
        // Password reset verification - redirect to update password page
        redirectTo.pathname = '/auth/update-password'
        redirectTo.searchParams.set('access_token', data.session.access_token)
        redirectTo.searchParams.set('refresh_token', data.session.refresh_token)
        return NextResponse.redirect(redirectTo)
      } else {
        // Email/signup/email_change verification - session is automatically established by Supabase
        // Redirect to root and let middleware handle role-based routing
        redirectTo.pathname = '/'
        redirectTo.searchParams.set('verified', 'true')

        return NextResponse.redirect(redirectTo)
      }
    }

    // Handle specific error cases for PKCE flow
    let errorType = 'verification_failed'
    let errorMessage = 'Verificatie mislukt. Probeer opnieuw.'

    if (error) {
      const errorMsg = error.message.toLowerCase()

      if (errorMsg.includes('token_hash_not_found') || errorMsg.includes('invalid_token_hash')) {
        errorType = 'invalid_token_hash'
        errorMessage = 'Ongeldige verificatietoken. Controleer of u de juiste link uit uw e-mail gebruikt.'
      } else if (errorMsg.includes('expired') || errorMsg.includes('token_expired')) {
        errorType = type === 'recovery' ? 'recovery_expired' : 'verification_expired'
        errorMessage = type === 'recovery'
          ? 'Wachtwoord reset link is verlopen. Vraag een nieuwe link aan.'
          : 'Verificatielink is verlopen. Probeer opnieuw te registreren.'
      } else if (errorMsg.includes('already_used') || errorMsg.includes('token_used')) {
        errorType = 'token_already_used'
        errorMessage = type === 'recovery'
          ? 'Deze wachtwoord reset link is al gebruikt. Vraag een nieuwe link aan.'
          : 'Deze verificatielink is al gebruikt. Probeer in te loggen.'
      } else if (errorMsg.includes('already confirmed') || errorMsg.includes('email_confirmed')) {
        // User already verified - redirect to login
        redirectTo.pathname = '/auth'
        redirectTo.searchParams.set('message', 'E-mail is al bevestigd. U kunt inloggen.')
        return NextResponse.redirect(redirectTo)
      } else if (errorMsg.includes('invalid') || errorMsg.includes('malformed')) {
        errorType = 'invalid_token'
        errorMessage = 'Ongeldige verificatielink. Controleer of de link compleet is gekopieerd.'
      } else if (errorMsg.includes('pkce') || errorMsg.includes('code_challenge')) {
        errorType = 'pkce_error'
        errorMessage = 'Verificatiefout. Probeer opnieuw via een nieuwe link uit uw e-mail.'
      }

      console.error(`PKCE verification error for type ${type}:`, error.message)
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