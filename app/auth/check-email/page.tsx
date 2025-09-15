'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function CheckEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email')
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [canResend, setCanResend] = useState(true)

  const handleResendVerification = async () => {
    if (!email || !canResend) return

    setIsResending(true)
    setResendMessage('')

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (response.ok) {
        setResendMessage('Nieuwe verificatie-e-mail verzonden!')
        setCanResend(false)
        // Re-enable resend after 30 seconds
        setTimeout(() => setCanResend(true), 30000)
      } else {
        setResendMessage(result.error || 'Er is iets fout gegaan. Probeer het opnieuw.')
      }
    } catch {
      setResendMessage('Er is iets fout gegaan. Probeer het opnieuw.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle>Controleer uw e-mail</CardTitle>
          <CardDescription>
            We hebben een verificatielink gestuurd naar:
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          {email && (
            <div className="font-medium text-gray-900 bg-gray-100 p-3 rounded">
              {email}
            </div>
          )}

          <div className="text-sm text-gray-600 space-y-2">
            <p>Klik op de link in de e-mail om uw account te activeren.</p>
            <p>Geen e-mail ontvangen? Controleer uw spam-map.</p>
          </div>

          {resendMessage && (
            <Alert className={`${
              resendMessage.includes('verzonden')
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}>
              {resendMessage.includes('verzonden') ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={`${
                resendMessage.includes('verzonden')
                  ? 'text-green-800'
                  : 'text-red-800'
              }`}>
                {resendMessage}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            {email && (
              <Button
                onClick={handleResendVerification}
                variant="outline"
                className="w-full"
                disabled={isResending || !canResend}
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Bezig met verzenden...
                  </>
                ) : (
                  !canResend ? 'Wacht 30 seconden...' : 'Nieuwe verificatie-e-mail'
                )}
              </Button>
            )}

            <Button
              onClick={() => router.push('/auth')}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Terug naar inloggen
            </Button>

            <p className="text-xs text-gray-500">
              Na verificatie kunt u inloggen met uw e-mail en wachtwoord.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}