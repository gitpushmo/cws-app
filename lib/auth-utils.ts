import { AuthError } from '@supabase/supabase-js'

export interface AuthErrorMapping {
  [key: string]: string
}

// Dutch error messages for authentication
export const authErrorMessages: AuthErrorMapping = {
  // Login errors
  'Invalid login credentials': 'Ongeldige e-mail of wachtwoord',
  'Email not confirmed': 'Bevestig eerst uw e-mail voordat u inlogt. Controleer uw mailbox en spam-map.',
  'Too many requests': 'Te veel inlogpogingen. Wacht enkele minuten voordat u opnieuw probeert.',
  'Invalid email': 'Ongeldig e-mailadres',
  'Password should be at least': 'Wachtwoord moet minimaal 6 tekens lang zijn',

  // Signup errors
  'User already registered': 'Dit e-mailadres is al geregistreerd. Controleer uw e-mail voor een verificatielink of probeer in te loggen.',
  'Email rate limit exceeded': 'Te veel e-mails verzonden. Wacht enkele minuten voordat u opnieuw probeert.',
  'Signup disabled': 'Registratie is momenteel uitgeschakeld',
  'Password too weak': 'Wachtwoord is te zwak. Gebruik minimaal 6 tekens.',

  // Verification errors
  'Token has expired': 'Verificatielink is verlopen. Probeer opnieuw te registreren.',
  'Invalid token': 'Ongeldige verificatielink. Controleer of u de juiste link heeft gebruikt.',
  'Email already confirmed': 'E-mail is al bevestigd. U kunt inloggen.',

  // Session errors
  'Session not found': 'Sessie niet gevonden. Log opnieuw in.',
  'Session expired': 'Sessie verlopen. Log opnieuw in.',
  'Refresh token not found': 'Authenticatie verlopen. Log opnieuw in.',

  // Profile errors
  'Profile not found': 'Gebruikersprofiel niet gevonden',
  'Profile creation failed': 'Fout bij aanmaken gebruikersprofiel',
  'Profile update failed': 'Fout bij bijwerken gebruikersprofiel',

  // Generic errors
  'Network error': 'Netwerkfout. Controleer uw internetverbinding.',
  'Server error': 'Serverfout. Probeer het later opnieuw.',
  'Unknown error': 'Er is een onbekende fout opgetreden',
}

/**
 * Maps Supabase auth errors to Dutch user-friendly messages
 */
export function mapAuthError(error: AuthError | Error | string): string {
  const errorMessage = typeof error === 'string' ? error : error.message

  // Find matching error message
  for (const [key, value] of Object.entries(authErrorMessages)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }

  // Default fallback
  return 'Er is een fout opgetreden. Probeer het opnieuw.'
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates password strength
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) {
    return { valid: false, message: 'Wachtwoord moet minimaal 6 tekens lang zijn' }
  }

  if (password.length > 72) {
    return { valid: false, message: 'Wachtwoord mag maximaal 72 tekens lang zijn' }
  }

  return { valid: true }
}

/**
 * Checks if user email is verified
 */
export function isEmailVerified(user: any): boolean {
  return user && user.email_confirmed_at !== null
}

/**
 * Auth state types for better type safety
 */
export type AuthState =
  | 'unauthenticated'
  | 'authenticated'
  | 'pending_verification'
  | 'loading'
  | 'error'

/**
 * Determines auth state based on user object
 */
export function getAuthState(user: any, loading: boolean = false): AuthState {
  if (loading) return 'loading'
  if (!user) return 'unauthenticated'
  if (!isEmailVerified(user)) return 'pending_verification'
  return 'authenticated'
}

/**
 * Format user data for client response
 */
export function formatUserResponse(user: any, profile?: any) {
  return {
    id: user.id,
    email: user.email,
    email_confirmed_at: user.email_confirmed_at,
    created_at: user.created_at,
    ...(profile && {
      name: profile.name,
      phone: profile.phone,
      company_name: profile.company_name,
      role: profile.role,
      invoice_address: profile.invoice_address,
    })
  }
}

/**
 * Simple in-memory rate limiting for auth endpoints
 * In production, use Redis or similar persistent storage
 */
const rateLimitStore = new Map<string, { attempts: number; resetTime: number }>()

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  RESEND_VERIFICATION: { maxAttempts: 3, windowMs: 60000 }, // 3 attempts per minute
  PASSWORD_RESET: { maxAttempts: 3, windowMs: 300000 }, // 3 attempts per 5 minutes
  LOGIN_ATTEMPTS: { maxAttempts: 5, windowMs: 900000 }, // 5 attempts per 15 minutes
}

/**
 * Check if an IP or email is rate limited for a specific action
 */
export function isRateLimited(
  identifier: string,
  action: keyof typeof RATE_LIMITS
): { limited: boolean; resetTime?: number; attemptsLeft?: number } {
  const key = `${action}:${identifier}`
  const config = RATE_LIMITS[action]
  const now = Date.now()

  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    // No record or expired - reset
    rateLimitStore.set(key, { attempts: 0, resetTime: now + config.windowMs })
    return { limited: false, attemptsLeft: config.maxAttempts }
  }

  if (record.attempts >= config.maxAttempts) {
    return {
      limited: true,
      resetTime: record.resetTime,
      attemptsLeft: 0
    }
  }

  return {
    limited: false,
    attemptsLeft: config.maxAttempts - record.attempts
  }
}

/**
 * Record an attempt for rate limiting
 */
export function recordAttempt(identifier: string, action: keyof typeof RATE_LIMITS): void {
  const key = `${action}:${identifier}`
  const config = RATE_LIMITS[action]
  const now = Date.now()

  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { attempts: 1, resetTime: now + config.windowMs })
  } else {
    record.attempts++
  }
}

/**
 * Get rate limit error message in Dutch
 */
export function getRateLimitMessage(action: keyof typeof RATE_LIMITS, resetTime: number): string {
  const minutes = Math.ceil((resetTime - Date.now()) / 60000)

  switch (action) {
    case 'RESEND_VERIFICATION':
      return `Te veel verificatie-emails verzonden. Probeer over ${minutes} minuut${minutes > 1 ? 'en' : ''} opnieuw.`
    case 'PASSWORD_RESET':
      return `Te veel wachtwoord reset verzoeken. Probeer over ${minutes} minuut${minutes > 1 ? 'en' : ''} opnieuw.`
    case 'LOGIN_ATTEMPTS':
      return `Te veel inlogpogingen. Probeer over ${minutes} minuut${minutes > 1 ? 'en' : ''} opnieuw.`
    default:
      return `Te veel verzoeken. Probeer over ${minutes} minuut${minutes > 1 ? 'en' : ''} opnieuw.`
  }
}

/**
 * Clean up expired rate limit records (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  // Try various headers for IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const remoteAddr = request.headers.get('remote-addr')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  return realIP || remoteAddr || 'unknown'
}