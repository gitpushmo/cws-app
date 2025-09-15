import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { mapAuthError } from '@/lib/auth-utils'

export async function POST() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json(
      { error: mapAuthError(error) },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Succesvol uitgelogd'
  })
}