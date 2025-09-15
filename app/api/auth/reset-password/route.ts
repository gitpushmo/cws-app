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
  const ipLimitCheck = isRateLimited(clientIP, 'PASSWORD_RESET')
  const emailLimitCheck = isRateLimited(email, 'PASSWORD_RESET')

  if (ipLimitCheck.limited) {
    return NextResponse.json(
      { error: getRateLimitMessage('PASSWORD_RESET', ipLimitCheck.resetTime!) },
      { status: 429 }
    )
  }

  if (emailLimitCheck.limited) {
    return NextResponse.json(
      { error: getRateLimitMessage('PASSWORD_RESET', emailLimitCheck.resetTime!) },
      { status: 429 }
    )
  }

  const supabase = await createClient()

  try {
    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/confirm?type=recovery`
    })

    // Record attempts regardless of success/failure to prevent enumeration
    recordAttempt(clientIP, 'PASSWORD_RESET')
    recordAttempt(email, 'PASSWORD_RESET')

    if (error) {
      console.error('Password reset error:', error)

      // Don't expose internal errors - return generic success
      if (error.message.includes('rate limit') || error.message.includes('too many')) {
        return NextResponse.json(
          { error: 'Te veel wachtwoord reset verzoeken. Probeer later opnieuw.' },
          { status: 429 }
        )
      }

      // For security, always return success message
      return NextResponse.json({
        success: true,
        message: 'Als dit e-mailadres geregistreerd is, ontvangt u een wachtwoord reset link.'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Wachtwoord reset link verzonden. Controleer uw e-mail en spam-map.'
    })

  } catch (error) {
    console.error('Unexpected password reset error:', error)

    // Record attempt to prevent abuse
    recordAttempt(clientIP, 'PASSWORD_RESET')
    recordAttempt(email, 'PASSWORD_RESET')

    // For security, still return success message
    return NextResponse.json({
      success: true,
      message: 'Als dit e-mailadres geregistreerd is, ontvangt u een wachtwoord reset link.'
    })
  }
}