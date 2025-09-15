import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  isValidEmail,
  isRateLimited,
  recordAttempt,
  getRateLimitMessage,
  getClientIP,
  mapAuthError
} from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  const { email } = await request.json()

  // Validate email
  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: 'Geldig e-mailadres is verplicht' },
      { status: 400 }
    )
  }

  // Rate limiting by IP and email
  const clientIP = getClientIP(request)
  const ipLimitCheck = isRateLimited(clientIP, 'RESEND_VERIFICATION')
  const emailLimitCheck = isRateLimited(email, 'RESEND_VERIFICATION')

  if (ipLimitCheck.limited) {
    return NextResponse.json(
      { error: getRateLimitMessage('RESEND_VERIFICATION', ipLimitCheck.resetTime!) },
      { status: 429 }
    )
  }

  if (emailLimitCheck.limited) {
    return NextResponse.json(
      { error: getRateLimitMessage('RESEND_VERIFICATION', emailLimitCheck.resetTime!) },
      { status: 429 }
    )
  }

  const supabase = await createClient()

  try {
    // Resend verification email - Supabase will handle if user exists/verified
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/confirm`
      }
    })

    // Record attempts regardless of success/failure to prevent abuse
    recordAttempt(clientIP, 'RESEND_VERIFICATION')
    recordAttempt(email, 'RESEND_VERIFICATION')

    if (error) {
      console.error('Resend verification error:', error)

      // Don't expose internal errors - return generic success for security
      if (error.message.includes('rate limit') || error.message.includes('too many')) {
        return NextResponse.json(
          { error: 'Te veel e-mails verzonden. Probeer later opnieuw.' },
          { status: 429 }
        )
      }

      // For security, don't reveal if email doesn't exist or is already verified
      return NextResponse.json({
        success: true,
        message: 'Als dit e-mailadres geregistreerd is en nog niet bevestigd, ontvangt u een nieuwe verificatielink.'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Nieuwe verificatielink verzonden. Controleer uw e-mail en spam-map.'
    })

  } catch (error) {
    console.error('Unexpected resend verification error:', error)

    // Record attempt to prevent abuse
    recordAttempt(clientIP, 'RESEND_VERIFICATION')
    recordAttempt(email, 'RESEND_VERIFICATION')

    return NextResponse.json(
      { error: 'Serverfout. Probeer het later opnieuw.' },
      { status: 500 }
    )
  }
}