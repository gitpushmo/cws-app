'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'

const updatePasswordSchema = z.object({
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 tekens zijn'),
  confirmPassword: z.string().min(6, 'Bevestiging is verplicht'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Wachtwoorden komen niet overeen",
  path: ["confirmPassword"],
})

type UpdatePasswordForm = z.infer<typeof updatePasswordSchema>

export default function UpdatePasswordPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const form = useForm<UpdatePasswordForm>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    // Check if required tokens are present in URL
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')

    if (!accessToken || !refreshToken) {
      setMessage('Ongeldige of verlopen reset link. Probeer opnieuw een reset aan te vragen.')
    }
  }, [searchParams])

  async function onSubmit(values: UpdatePasswordForm) {
    setLoading(true)
    setMessage('')

    // Get tokens from URL parameters
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')

    if (!accessToken || !refreshToken) {
      setMessage('Ongeldige of verlopen reset sessie. Vraag een nieuwe wachtwoord reset aan.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: values.password,
          access_token: accessToken,
          refresh_token: refreshToken,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error)
        return
      }

      setSuccess(true)
      setMessage(result.message || 'Wachtwoord succesvol bijgewerkt! U wordt doorgestuurd naar inloggen.')

      // Redirect to login after success
      setTimeout(() => {
        router.push('/auth?updated=true')
      }, 2000)
    } catch (error) {
      console.error('Update password error:', error)
      setMessage('Er is iets fout gegaan. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Nieuw wachtwoord instellen</CardTitle>
          <CardDescription>
            Voer uw nieuwe wachtwoord in
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nieuw wachtwoord</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bevestig nieuw wachtwoord</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
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
                disabled={loading || success}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Bezig met bijwerken...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Bijgewerkt! Wordt doorgestuurd...
                  </>
                ) : (
                  'Wachtwoord bijwerken'
                )}
              </Button>
            </form>
          </Form>

          {!success && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => router.push('/auth')}
                className="text-sm text-blue-600 hover:underline"
              >
                Terug naar inloggen
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}