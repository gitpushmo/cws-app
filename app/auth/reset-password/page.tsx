'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'

const resetSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
})

type ResetForm = z.infer<typeof resetSchema>

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const form = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: '',
    },
  })

  async function onSubmit(values: ResetForm) {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error)
        return
      }

      setSuccess(true)
      setMessage(result.message || `We hebben een wachtwoord reset link gestuurd naar ${values.email}. Controleer uw e-mail.`)
    } catch (error) {
      console.error('Reset password error:', error)
      setMessage('Er is iets fout gegaan. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-green-800">E-mail verstuurd</CardTitle>
            <CardDescription>
              We hebben een wachtwoord reset link gestuurd naar uw e-mailadres.
            </CardDescription>
          </CardHeader>

          <CardContent className="text-center space-y-4">
            <Alert className="border-green-200 bg-green-50 text-left">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <p className="font-medium mb-2">Volgende stappen:</p>
                <ul className="space-y-1 list-disc list-inside text-sm">
                  <li>Controleer uw e-mail inbox</li>
                  <li>Klik op de reset link in de e-mail</li>
                  <li>Voer uw nieuwe wachtwoord in</li>
                  <li>Controleer ook uw spam-map</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => router.push('/auth')}
              variant="outline"
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Wachtwoord vergeten</CardTitle>
          <CardDescription>
            Voer uw e-mailadres in om een reset link te ontvangen
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="uw@email.nl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {message && (
                <Alert className={`${
                  success
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}>
                  {success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={`${
                    success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {message}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Bezig met verzenden...
                  </>
                ) : (
                  'Reset link verzenden'
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.push('/auth')}
              className="text-sm text-blue-600 hover:underline"
            >
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Terug naar inloggen
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}