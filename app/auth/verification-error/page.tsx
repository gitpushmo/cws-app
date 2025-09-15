'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft } from 'lucide-react'

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
      case 'invalid_link':
        return {
          title: 'Ongeldige link',
          description: 'De verificatielink is niet correct. Controleer of u de juiste link heeft gebruikt uit uw e-mail.'
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
          <div className="text-sm text-gray-600 space-y-2">
            <p>Mogelijke oplossingen:</p>
            <ul className="text-left space-y-1 list-disc list-inside">
              <li>Controleer of de link nog geldig is (links verlopen na 24 uur)</li>
              <li>Probeer opnieuw te registreren met hetzelfde e-mailadres</li>
              <li>Controleer uw spam-map voor nieuwe verificatie-e-mails</li>
            </ul>
          </div>

          <Button
            onClick={() => router.push('/auth')}
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar inloggen
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}