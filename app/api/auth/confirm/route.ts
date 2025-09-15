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

  if (token_hash && type) {
    const supabase = await createClient()

    try {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      })

      if (!error) {
        // Handle different verification types
        if (type === 'recovery') {
          // Password reset verification successful - redirect to update password page
          redirectTo.pathname = '/auth/update-password'
          return NextResponse.redirect(redirectTo)
        } else {
          // Email verification successful - redirect to auth page with success message
          redirectTo.pathname = '/auth'
          redirectTo.searchParams.set('verified', 'true')
          return NextResponse.redirect(redirectTo)
        }
      }

      // Log the error for debugging but still check if user is authenticated
      console.error('Verification error:', error)

      // For password reset, don't try to recover from errors
      if (type === 'recovery') {
        redirectTo.pathname = '/auth/verification-error'
        redirectTo.searchParams.set('error', 'recovery_failed')
        return NextResponse.redirect(redirectTo)
      }

      // Sometimes verification "fails" but user is actually authenticated
      // Check if user is authenticated anyway
      const { data: { user } } = await supabase.auth.getUser()

      if (user && user.email_confirmed_at) {
        // User is authenticated and verified, treat as success
        redirectTo.pathname = '/auth'
        redirectTo.searchParams.set('verified', 'true')
        return NextResponse.redirect(redirectTo)
      }

      // Verification truly failed
      redirectTo.pathname = '/auth/verification-error'
      redirectTo.searchParams.set('error', 'verification_failed')
      return NextResponse.redirect(redirectTo)

    } catch (error) {
      console.error('Unexpected verification error:', error)

      // For password reset, don't try to recover from errors
      if (type === 'recovery') {
        redirectTo.pathname = '/auth/verification-error'
        redirectTo.searchParams.set('error', 'recovery_failed')
        return NextResponse.redirect(redirectTo)
      }

      // Check if user is authenticated despite the error
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user && user.email_confirmed_at) {
          redirectTo.pathname = '/auth'
          redirectTo.searchParams.set('verified', 'true')
          return NextResponse.redirect(redirectTo)
        }
      } catch {
        // Ignore nested error
      }

      redirectTo.pathname = '/auth/verification-error'
      redirectTo.searchParams.set('error', 'verification_failed')
      return NextResponse.redirect(redirectTo)
    }
  }

  // Missing parameters
  redirectTo.pathname = '/auth/verification-error'
  redirectTo.searchParams.set('error', 'invalid_link')
  return NextResponse.redirect(redirectTo)
}