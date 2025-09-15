'use client'

import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth'
import { useState } from 'react'

interface LogoutButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export default function LogoutButton({
  variant = 'outline',
  size = 'default',
  className
}: LogoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await signOut()
    } catch (error) {
      console.error('Logout failed:', error)
      setLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleLogout}
      disabled={loading}
    >
      {loading ? 'Uitloggen...' : 'Uitloggen'}
    </Button>
  )
}