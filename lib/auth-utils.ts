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