export interface UserProfile {
  id: string
  email: string
  name: string
  phone: string
  role: 'customer' | 'operator' | 'admin'
  company_name?: string
  invoice_address?: Record<string, unknown>
  shipping_address: Record<string, unknown>
  created_at: string
  updated_at: string
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const response = await fetch('/api/auth/user', {
      credentials: 'include',
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.user
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}

export async function signOut(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })

    // Redirect to auth page
    window.location.href = '/auth'
  } catch (error) {
    console.error('Error signing out:', error)
    // Still redirect even if API call fails
    window.location.href = '/auth'
  }
}

export function getRoleRedirectPath(role: string): string {
  switch (role) {
    case 'customer':
      return '/klant'
    case 'operator':
      return '/operator'
    case 'admin':
      return '/admin'
    default:
      return '/klant'
  }
}