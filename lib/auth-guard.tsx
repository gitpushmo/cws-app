import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'

interface AuthGuardProps {
  children: ReactNode
  requiredRole?: 'customer' | 'operator' | 'admin'
  allowedRoles?: ('customer' | 'operator' | 'admin')[]
}

export default async function AuthGuard({
  children,
  requiredRole,
  allowedRoles
}: AuthGuardProps) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/auth')
  }

  // Check role permissions
  if (requiredRole && profile.role !== requiredRole) {
    redirect('/auth')
  }

  if (allowedRoles && !allowedRoles.includes(profile.role as 'customer' | 'operator' | 'admin')) {
    redirect('/auth')
  }

  return <>{children}</>
}

export async function getCurrentUserProfile() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return null
  }

  return profile
}