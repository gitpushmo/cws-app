import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'email' | 'signup' | null
  const next = searchParams.get('next') ?? '/'

  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')
  redirectTo.searchParams.delete('next')

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      // Get the user to ensure session is established
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (!userError && user) {
        // Email verification successful - redirect to auth page with success message
        redirectTo.pathname = '/auth'
        redirectTo.searchParams.set('verified', 'true')
        return NextResponse.redirect(redirectTo)
      }
    }

    // Verification failed
    redirectTo.pathname = '/auth/verification-error'
    redirectTo.searchParams.set('error', 'verification_failed')
    return NextResponse.redirect(redirectTo)
  }

  // Missing parameters
  redirectTo.pathname = '/auth/verification-error'
  redirectTo.searchParams.set('error', 'invalid_link')
  return NextResponse.redirect(redirectTo)
}