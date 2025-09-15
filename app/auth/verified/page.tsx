'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle } from 'lucide-react'

export default function VerifiedPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)

  const success = searchParams.get('success') === 'true'
  const error = searchParams.get('error')

  useEffect(() => {
    if (success) {
      // Auto-redirect after successful verification
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            router.push('/auth?verified=true')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [success, router])

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-green-800">E-mail geverifieerd!</CardTitle>
            <CardDescription>
              Uw e-mailadres is succesvol geverifieerd. U kunt nu inloggen.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              U wordt over {countdown} seconden doorgestuurd naar de inlogpagina...
            </p>
            <Button
              onClick={() => router.push('/auth?verified=true')}
              className="w-full"
            >
              Nu inloggen
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-red-800">Verificatie mislukt</CardTitle>
          <CardDescription>
            {error === 'invalid_token'
              ? 'De verificatielink is ongeldig of verlopen.'
              : 'Er is een fout opgetreden bij het verifiëren van uw e-mailadres.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-gray-600">
            Controleer of u de juiste link heeft gebruikt uit de meest recente e-mail.
          </p>
          <Button
            onClick={() => router.push('/auth')}
            className="w-full"
          >
            Terug naar inloggen
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}