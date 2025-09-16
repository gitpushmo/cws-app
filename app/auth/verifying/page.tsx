'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'

export default function VerifyingPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [countdown, setCountdown] = useState(3)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get verification parameters from URL
        const token = searchParams.get('token')
        const type = searchParams.get('type')
        const tokenHash = searchParams.get('token_hash')

        if (!token || !type) {
          setStatus('error')
          setMessage('Ongeldige verificatielink. Ontbrekende parameters.')
          return
        }

        // Call the confirm API endpoint
        const response = await fetch('/api/auth/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            type,
            token_hash: tokenHash
          }),
        })

        if (response.ok) {
          const result = await response.json()
          setStatus('success')
          setMessage(result.message || 'E-mail succesvol geverifieerd!')

          // Start countdown and redirect
          const redirectTo = type === 'recovery' ? '/auth/update-password' : '/auth?verified=true'

          const timer = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(timer)
                router.push(redirectTo)
                return 0
              }
              return prev - 1
            })
          }, 1000)

          return () => clearInterval(timer)
        } else {
          // Handle API errors
          const errorData = await response.json()
          const errorType = errorData.error_type || 'unknown'

          // Redirect to verification error page with error type
          router.push(`/auth/verification-error?error=${errorType}`)
        }
      } catch (error) {
        console.error('Verification error:', error)
        setStatus('error')
        setMessage('Er is een onverwachte fout opgetreden tijdens de verificatie.')
      }
    }

    verifyEmail()
  }, [searchParams, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <CardTitle className="text-blue-800">Bezig met verifiëren</CardTitle>
            <CardDescription>
              Even geduld, we controleren uw verificatielink...
            </CardDescription>
          </CardHeader>

          <CardContent className="text-center space-y-4">
            <Alert className="border-blue-200 bg-blue-50 text-left">
              <Mail className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <p className="font-medium mb-2">Wat gebeurt er nu:</p>
                <ul className="space-y-1 list-disc list-inside text-sm">
                  <li>We controleren de verificatielink uit uw e-mail</li>
                  <li>Uw e-mailadres wordt geactiveerd</li>
                  <li>U wordt doorgestuurd naar de volgende stap</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="text-sm text-gray-600">
              <p>Dit duurt meestal maar een paar seconden...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-green-800">Verificatie geslaagd!</CardTitle>
            <CardDescription>
              {message}
            </CardDescription>
          </CardHeader>

          <CardContent className="text-center space-y-4">
            <Alert className="border-green-200 bg-green-50 text-left">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <p className="font-medium mb-2">Gelukt!</p>
                <p className="text-sm">
                  U wordt automatisch doorgestuurd over {countdown} seconde{countdown !== 1 ? 's' : ''}...
                </p>
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => {
                const type = searchParams.get('type')
                const redirectTo = type === 'recovery' ? '/auth/update-password' : '/auth?verified=true'
                router.push(redirectTo)
              }}
              className="w-full"
            >
              Direct doorgaan
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-red-800">Verificatie mislukt</CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          <Alert className="border-red-200 bg-red-50 text-left">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <p className="font-medium mb-2">Er is iets misgegaan:</p>
              <p className="text-sm">
                De verificatie kon niet worden voltooid. Probeer het opnieuw met een nieuwe link.
              </p>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Button
              onClick={() => router.push('/auth/verification-error')}
              className="w-full"
            >
              Hulp bij verificatie
            </Button>

            <Button
              onClick={() => router.push('/auth')}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Terug naar inloggen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}