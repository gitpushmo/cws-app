import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  // Get user profile to redirect to correct dashboard
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'customer') {
    redirect('/klant')
  } else if (profile?.role === 'operator') {
    redirect('/operator')
  } else if (profile?.role === 'admin') {
    redirect('/admin')
  } else {
    // Fallback for users without profiles
    redirect('/klant')
  }
}
