'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft, RefreshCw, Loader2, CheckCircle, Mail, Clock, Shield, XCircle, AlertTriangle } from 'lucide-react'

export default function VerificationErrorPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)

  const getErrorInfo = (errorType: string | null) => {
    switch (errorType) {
      case 'verification_failed':
        return {
          title: 'Verificatie mislukt',
          description: 'De verificatielink is ongeldig of verlopen.',
          category: 'general',
          icon: AlertCircle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-100',
          guidance: [
            'Controleer of u de juiste link gebruikt uit uw e-mail',
            'Vraag een nieuwe verificatielink aan',
            'Probeer opnieuw te registreren als het probleem blijft bestaan'
          ],
          primaryAction: 'resend_verification',
          secondaryActions: ['login', 'reset_password']
        }
      case 'recovery_failed':
        return {
          title: 'Wachtwoord reset mislukt',
          description: 'De wachtwoord reset link is ongeldig of verlopen.',
          category: 'recovery',
          icon: Shield,
          iconColor: 'text-orange-600',
          bgColor: 'bg-orange-100',
          guidance: [
            'De reset link werkt slechts één keer',
            'Reset links verlopen na 24 uur',
            'Vraag een nieuwe wachtwoord reset aan'
          ],
          primaryAction: 'reset_password',
          secondaryActions: ['login']
        }
      case 'invalid_link':
        return {
          title: 'Ongeldige link',
          description: 'De link is beschadigd of onvolledig gekopieerd.',
          category: 'invalid',
          icon: XCircle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-100',
          guidance: [
            'Kopieer de volledige link uit uw e-mail',
            'Klik direct op de link in plaats van kopiëren',
            'Controleer of er geen extra tekens zijn toegevoegd'
          ],
          primaryAction: 'resend_verification',
          secondaryActions: ['login', 'reset_password']
        }
      case 'invalid_type':
        return {
          title: 'Ongeldig verificatietype',
          description: 'Deze link heeft een onbekend verificatietype.',
          category: 'technical',
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
          bgColor: 'bg-amber-100',
          guidance: [
            'Gebruik de link direct uit uw e-mail',
            'Controleer of u de nieuwste e-mail gebruikt',
            'Vraag een nieuwe link aan als dit blijft gebeuren'
          ],
          primaryAction: 'resend_verification',
          secondaryActions: ['login', 'reset_password']
        }
      case 'invalid_token_hash':
        return {
          title: 'Ongeldige verificatietoken',
          description: 'De beveiligingstoken in de link is ongeldig.',
          category: 'security',
          icon: Shield,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-100',
          guidance: [
            'Dit kan gebeuren als de link is beschadigd',
            'Kopieer de volledige link uit uw e-mail',
            'Vraag een nieuwe verificatielink aan'
          ],
          primaryAction: 'resend_verification',
          secondaryActions: ['login', 'reset_password']
        }
      case 'verification_expired':
        return {
          title: 'Verificatielink verlopen',
          description: 'Deze verificatielink is verlopen en niet meer geldig.',
          category: 'expired',
          icon: Clock,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-100',
          guidance: [
            'Verificatielinks verlopen na 24 uur voor uw veiligheid',
            'Vraag een nieuwe verificatielink aan',
            'Controleer uw e-mail binnen 24 uur na aanvragen'
          ],
          primaryAction: 'resend_verification',
          secondaryActions: ['login']
        }
      case 'recovery_expired':
        return {
          title: 'Wachtwoord reset verlopen',
          description: 'Deze wachtwoord reset link is verlopen.',
          category: 'expired',
          icon: Clock,
          iconColor: 'text-orange-600',
          bgColor: 'bg-orange-100',
          guidance: [
            'Reset links verlopen na 24 uur voor uw veiligheid',
            'Vraag een nieuwe wachtwoord reset aan',
            'Gebruik de link binnen 24 uur na aanvragen'
          ],
          primaryAction: 'reset_password',
          secondaryActions: ['login']
        }
      case 'token_already_used':
        return {
          title: 'Link al gebruikt',
          description: 'Deze verificatielink is al eerder gebruikt.',
          category: 'used',
          icon: CheckCircle,
          iconColor: 'text-green-600',
          bgColor: 'bg-green-100',
          guidance: [
            'Elke verificatielink kan maar één keer gebruikt worden',
            'Uw e-mail is mogelijk al geverifieerd',
            'Probeer in te loggen met uw gegevens'
          ],
          primaryAction: 'login',
          secondaryActions: ['resend_verification', 'reset_password']
        }
      case 'invalid_token':
        return {
          title: 'Ongeldige token',
          description: 'De verificatietoken is beschadigd of onvolledig.',
          category: 'invalid',
          icon: XCircle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-100',
          guidance: [
            'De link is mogelijk onvolledig gekopieerd',
            'Gebruik de link direct uit uw e-mail',
            'Vraag een nieuwe link aan als het probleem blijft'
          ],
          primaryAction: 'resend_verification',
          secondaryActions: ['login', 'reset_password']
        }
      case 'pkce_error':
        return {
          title: 'Verificatiefout',
          description: 'Er is een technische fout opgetreden bij de beveiligingscontrole.',
          category: 'technical',
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
          bgColor: 'bg-amber-100',
          guidance: [
            'Dit is een tijdelijke technische fout',
            'Probeer opnieuw via een nieuwe link',
            'Gebruik de link direct uit uw e-mail'
          ],
          primaryAction: 'resend_verification',
          secondaryActions: ['login', 'reset_password']
        }
      default:
        return {
          title: 'Verificatiefout',
          description: 'Er is een onbekend probleem opgetreden.',
          category: 'general',
          icon: AlertCircle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-100',
          guidance: [
            'Probeer opnieuw via een nieuwe link',
            'Controleer uw e-mail voor nieuwe berichten',
            'Neem contact op als het probleem blijft bestaan'
          ],
          primaryAction: 'resend_verification',
          secondaryActions: ['login', 'reset_password']
        }
    }
  }

  const errorInfo = getErrorInfo(error)

  const renderActionButton = (actionType: string, isPrimary = false) => {
    switch (actionType) {
      case 'resend_verification':
        return !showEmailInput ? (
          <Button
            key="resend"
            onClick={() => setShowEmailInput(true)}
            className={isPrimary ? "w-full" : "w-full"}
            variant={isPrimary ? "default" : "outline"}
          >
            <Mail className="w-4 h-4 mr-2" />
            Nieuwe verificatie aanvragen
          </Button>
        ) : (
          <div key="resend-form" className="space-y-2">
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
        )
      case 'reset_password':
        return (
          <Button
            key="reset"
            onClick={() => router.push('/auth/reset-password')}
            className="w-full"
            variant={isPrimary ? "default" : "outline"}
          >
            <Shield className="w-4 h-4 mr-2" />
            {isPrimary ? 'Nieuwe reset aanvragen' : 'Wachtwoord reset'}
          </Button>
        )
      case 'login':
        return (
          <Button
            key="login"
            onClick={() => router.push('/auth')}
            className="w-full"
            variant={isPrimary ? "default" : "outline"}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isPrimary ? 'Probeer in te loggen' : 'Terug naar inloggen'}
          </Button>
        )
      default:
        return null
    }
  }

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
          <div className={`mx-auto mb-4 w-16 h-16 ${errorInfo.bgColor} rounded-full flex items-center justify-center`}>
            <errorInfo.icon className={`w-8 h-8 ${errorInfo.iconColor}`} />
          </div>
          <CardTitle className={errorInfo.iconColor.replace('text-', 'text-').replace('-600', '-800')}>{errorInfo.title}</CardTitle>
          <CardDescription className="text-gray-600">
            {errorInfo.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          <Alert className="border-blue-200 bg-blue-50 text-left">
            <RefreshCw className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <p className="font-medium mb-2">Hoe kunt u dit oplossen:</p>
              <ul className="space-y-1 list-disc list-inside text-sm">
                {errorInfo.guidance.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
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
            {/* Primary action */}
            {renderActionButton(errorInfo.primaryAction, true)}

            {/* Secondary actions */}
            {errorInfo.secondaryActions.map((action) =>
              renderActionButton(action, false)
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}