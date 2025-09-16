'use client'

import { Button } from '@/components/ui/button'

interface ScrollToButtonProps {
  targetId: string
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  children: React.ReactNode
}

export default function ScrollToButton({
  targetId,
  className,
  variant = 'outline',
  children
}: ScrollToButtonProps) {
  const handleClick = () => {
    document.querySelector(`#${targetId}`)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleClick}
    >
      {children}
    </Button>
  )
}