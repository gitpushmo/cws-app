'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle, Shield, UserCheck } from 'lucide-react'

export default function CheckEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email')
  const type = searchParams.get('type') // 'signup' or 'recovery'
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [canResend, setCanResend] = useState(true)

  const getContextInfo = () => {
    const isRecovery = type === 'recovery'

    return {
      icon: isRecovery ? Shield : UserCheck,
      iconColor: isRecovery ? 'text-orange-600' : 'text-blue-600',
      bgColor: isRecovery ? 'bg-orange-100' : 'bg-blue-100',
      title: isRecovery ? 'Controleer uw e-mail voor wachtwoord reset' : 'Controleer uw e-mail',
      description: isRecovery
        ? 'We hebben een wachtwoord reset link gestuurd naar:'
        : 'We hebben een verificatielink gestuurd naar:',
      instructions: isRecovery ? [
        'Klik op de link in de e-mail om uw wachtwoord te resetten',
        'U wordt doorgeleid naar een beveiligde pagina',
        'Kies een nieuw, sterk wachtwoord',
        'Geen e-mail ontvangen? Controleer uw spam-map'
      ] : [
        'Klik op de link in de e-mail om uw account te activeren',
        'Na verificatie kunt u direct inloggen',
        'Geen e-mail ontvangen? Controleer uw spam-map'
      ],
      resendText: isRecovery ? 'Nieuwe reset link' : 'Nieuwe verificatie-e-mail',
      footerText: isRecovery
        ? 'Na wachtwoord reset kunt u inloggen met uw nieuwe wachtwoord'
        : 'Na verificatie kunt u inloggen met uw e-mail en wachtwoord'
    }
  }

  const contextInfo = getContextInfo()

  const handleResendVerification = async () => {
    if (!email || !canResend) return

    setIsResending(true)
    setResendMessage('')

    try {
      const endpoint = type === 'recovery' ? '/api/auth/reset-password' : '/api/auth/resend-verification'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (response.ok) {
        const successMessage = type === 'recovery'
          ? 'Nieuwe wachtwoord reset link verzonden!'
          : 'Nieuwe verificatie-e-mail verzonden!'
        setResendMessage(successMessage)
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
          <div className={`mx-auto mb-4 w-16 h-16 ${contextInfo.bgColor} rounded-full flex items-center justify-center`}>
            <contextInfo.icon className={`w-8 h-8 ${contextInfo.iconColor}`} />
          </div>
          <CardTitle>{contextInfo.title}</CardTitle>
          <CardDescription>
            {contextInfo.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          {email && (
            <div className="font-medium text-gray-900 bg-gray-100 p-3 rounded">
              {email}
            </div>
          )}

          <Alert className={`${
            type === 'recovery' ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'
          } text-left`}>
            <Mail className={`h-4 w-4 ${contextInfo.iconColor}`} />
            <AlertDescription className={`${
              type === 'recovery' ? 'text-orange-800' : 'text-blue-800'
            }`}>
              <p className="font-medium mb-2">Volgende stappen:</p>
              <ul className="space-y-1 list-disc list-inside text-sm">
                {contextInfo.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>

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
                  !canResend ? 'Wacht 30 seconden...' : contextInfo.resendText
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
              {contextInfo.footerText}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}