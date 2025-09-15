'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft, RefreshCw, Loader2, CheckCircle, Mail } from 'lucide-react'

export default function VerificationErrorPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)

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
      case 'invalid_type':
        return {
          title: 'Ongeldig verificatietype',
          description: 'De verificatielink heeft een ongeldig type. Gebruik de link direct uit uw e-mail.'
        }
      case 'invalid_token_hash':
        return {
          title: 'Ongeldige verificatietoken',
          description: 'De verificatietoken in de link is ongeldig. Controleer of u de complete link gebruikt uit uw e-mail.'
        }
      case 'verification_expired':
        return {
          title: 'Verificatielink verlopen',
          description: 'De verificatielink is verlopen. Probeer opnieuw te registreren of vraag een nieuwe verificatielink aan.'
        }
      case 'recovery_expired':
        return {
          title: 'Wachtwoord reset link verlopen',
          description: 'De wachtwoord reset link is verlopen. Vraag een nieuwe wachtwoord reset aan.'
        }
      case 'token_already_used':
        return {
          title: 'Link al gebruikt',
          description: 'Deze verificatielink is al gebruikt. Probeer in te loggen of vraag een nieuwe link aan als dat niet lukt.'
        }
      case 'invalid_token':
        return {
          title: 'Ongeldige token',
          description: 'De verificatietoken is ongeldig of beschadigd. Zorg dat u de complete link kopieert uit uw e-mail.'
        }
      case 'pkce_error':
        return {
          title: 'Verificatiefout',
          description: 'Er is een technische fout opgetreden bij de verificatie. Probeer opnieuw via een nieuwe link uit uw e-mail.'
        }
      default:
        return {
          title: 'Verificatiefout',
          description: 'Er is een probleem opgetreden bij het verifiëren van uw e-mail. Probeer het opnieuw.'
        }
    }
  }

  const errorInfo = getErrorMessage(error)

  const handleResendVerification = async () => {
    if (!email || !email.includes('@')) {
      setResendMessage('Voer een geldig e-mailadres in')
      return
    }

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
        setShowEmailInput(false)
        setEmail('')
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

          {/* Email input for resend verification */}
          {showEmailInput && (
            <div className="space-y-3 text-left">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                E-mailadres voor nieuwe verificatie-e-mail:
              </label>
              <Input
                id="email"
                type="email"
                placeholder="uw@email.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleResendVerification()
                  }
                }}
              />
            </div>
          )}

          {/* Resend message */}
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
                {!showEmailInput ? (
                  <Button
                    onClick={() => setShowEmailInput(true)}
                    className="w-full"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Nieuwe verificatie aanvragen
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={handleResendVerification}
                      className="w-full"
                      disabled={isResending || !email}
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Bezig met verzenden...
                        </>
                      ) : (
                        'Verstuur verificatie-e-mail'
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowEmailInput(false)
                        setEmail('')
                        setResendMessage('')
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      Annuleren
                    </Button>
                  </div>
                )}

                <Button
                  onClick={() => router.push('/auth/reset-password')}
                  variant="outline"
                  className="w-full"
                >
                  Wachtwoord reset aanvragen
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