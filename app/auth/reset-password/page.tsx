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

      // Redirect to check email page with recovery type
      router.push(`/auth/check-email?email=${encodeURIComponent(values.email)}&type=recovery`)
    } catch (error) {
      console.error('Reset password error:', error)
      setMessage('Er is iets fout gegaan. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
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
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
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