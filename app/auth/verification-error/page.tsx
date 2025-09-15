'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'

export default function VerificationErrorPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams.get('error')

  const getErrorMessage = (errorType: string | null) => {
    switch (errorType) {
      case 'verification_failed':
        return {
          title: 'Verificatie mislukt',
          description: 'De verificatielink is ongeldig of verlopen. Probeer opnieuw in te loggen of een nieuwe account aan te maken.'
        }
      case 'recovery_failed':
        return {
          title: 'Wachtwoord reset mislukt',
          description: 'De wachtwoord reset link is ongeldig of verlopen. Probeer opnieuw een wachtwoord reset aan te vragen.'
        }
      case 'invalid_link':
        return {
          title: 'Ongeldige link',
          description: 'De link is niet correct. Controleer of u de juiste link heeft gebruikt uit uw e-mail.'
        }
      default:
        return {
          title: 'Verificatiefout',
          description: 'Er is een probleem opgetreden bij het verifiëren van uw e-mail. Probeer het opnieuw.'
        }
    }
  }

  const errorInfo = getErrorMessage(error)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-red-800">{errorInfo.title}</CardTitle>
          <CardDescription>
            {errorInfo.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          <Alert className="border-amber-200 bg-amber-50 text-left">
            <RefreshCw className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <p className="font-medium mb-2">Mogelijke oplossingen:</p>
              <ul className="space-y-1 list-disc list-inside text-sm">
                <li>Controleer of de link nog geldig is (links verlopen na 24 uur)</li>
                <li>Probeer opnieuw te registreren met hetzelfde e-mailadres</li>
                <li>Controleer uw spam-map voor nieuwe verificatie-e-mails</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            {error === 'recovery_failed' ? (
              <>
                <Button
                  onClick={() => router.push('/auth/reset-password')}
                  className="w-full"
                >
                  Nieuwe reset aanvragen
                </Button>

                <Button
                  onClick={() => router.push('/auth')}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Terug naar inloggen
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => router.push('/auth')}
                  className="w-full"
                >
                  Nieuwe poging
                </Button>

                <Button
                  onClick={() => router.push('/auth')}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Terug naar inloggen
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}