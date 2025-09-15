import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  isValidPassword,
  getClientIP,
  mapAuthError,
  formatUserResponse
} from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  const { password, access_token, refresh_token } = await request.json()

  // Validate required fields
  if (!password) {
    return NextResponse.json(
      { error: 'Wachtwoord is verplicht' },
      { status: 400 }
    )
  }

  if (!access_token || !refresh_token) {
    return NextResponse.json(
      { error: 'Ongeldige of verlopen reset sessie. Vraag een nieuwe wachtwoord reset aan.' },
      { status: 400 }
    )
  }

  // Validate password strength
  const passwordValidation = isValidPassword(password)
  if (!passwordValidation.valid) {
    return NextResponse.json(
      { error: passwordValidation.message },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  try {
    console.log('Password update attempt with token lengths:', {
      access_token: access_token.length,
      refresh_token: refresh_token.length
    })

    // Set the session first using the tokens from the reset link
    const { error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token
    })

    if (sessionError) {
      console.error('Session error during password update:', sessionError.message)
      return NextResponse.json(
        { error: 'Ongeldige of verlopen reset sessie. Vraag een nieuwe wachtwoord reset aan.' },
        { status: 401 }
      )
    }

    console.log('Session successfully set for password update')

    // Update the password
    const { data, error } = await supabase.auth.updateUser({
      password
    })

    if (error) {
      console.error('Password update error:', error)
      return NextResponse.json(
        { error: mapAuthError(error) },
        { status: 400 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Fout bij bijwerken wachtwoord. Probeer opnieuw.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Wachtwoord succesvol bijgewerkt. U kunt nu inloggen met uw nieuwe wachtwoord.',
      user: formatUserResponse(data.user)
    })

  } catch (error) {
    console.error('Unexpected password update error:', error)

    return NextResponse.json(
      { error: 'Serverfout bij bijwerken wachtwoord. Probeer het later opnieuw.' },
      { status: 500 }
    )
  }
}