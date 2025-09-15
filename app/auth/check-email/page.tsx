'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, ArrowLeft } from 'lucide-react'

export default function CheckEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email')

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

          <div className="space-y-2">
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