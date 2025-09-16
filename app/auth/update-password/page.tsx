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
import { CheckCircle, AlertCircle, Loader2, Eye, EyeOff, Shield, Info } from 'lucide-react'

const updatePasswordSchema = z.object({
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 tekens zijn'),
  confirmPassword: z.string().min(6, 'Bevestiging is verplicht'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Wachtwoorden komen niet overeen",
  path: ["confirmPassword"],
})

type UpdatePasswordForm = z.infer<typeof updatePasswordSchema>

const getPasswordStrength = (password: string) => {
  if (!password) return { strength: 0, label: '', color: 'bg-gray-200' }

  let strength = 0
  const feedback: string[] = []

  // Length check
  if (password.length >= 8) strength += 1
  else feedback.push('Minimaal 8 tekens')

  // Uppercase check
  if (/[A-Z]/.test(password)) strength += 1
  else feedback.push('Een hoofdletter')

  // Lowercase check
  if (/[a-z]/.test(password)) strength += 1
  else feedback.push('Een kleine letter')

  // Number check
  if (/\d/.test(password)) strength += 1
  else feedback.push('Een cijfer')

  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1
  else feedback.push('Een speciaal teken')

  const strengthLabels = ['Zeer zwak', 'Zwak', 'Matig', 'Sterk', 'Zeer sterk']
  const strengthColors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-400']

  return {
    strength,
    label: strengthLabels[strength] || 'Zeer zwak',
    color: strengthColors[strength] || 'bg-red-400',
    feedback: feedback.length > 0 ? feedback : null
  }
}

export default function UpdatePasswordPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(getPasswordStrength(''))
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
      setMessage('Deze reset sessie is ongeldig of verlopen. U moet opnieuw een wachtwoord reset aanvragen.')
    }
  }, [searchParams])

  async function onSubmit(values: UpdatePasswordForm) {
    setLoading(true)
    setMessage('')

    // Get tokens from URL parameters
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')

    if (!accessToken || !refreshToken) {
      setMessage('Reset sessie is ongeldig of verlopen. Vraag een nieuwe wachtwoord reset aan via de inlogpagina.')
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
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle>Nieuw wachtwoord instellen</CardTitle>
          <CardDescription>
            Kies een sterk wachtwoord om uw account te beveiligen
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!message.includes('Reset sessie is ongeldig') && (
            <Alert className="border-green-200 bg-green-50 mb-4">
              <Shield className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 text-sm">
                <span className="font-medium">Beveiligde sessie actief</span>
                <br />
                U kunt nu veilig uw wachtwoord wijzigen. Deze sessie verloopt automatisch na gebruik.
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nieuw wachtwoord</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e)
                              setPasswordStrength(getPasswordStrength(e.target.value))
                            }}
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

                        {/* Password strength indicator */}
                        {field.value && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Wachtwoord sterkte:</span>
                              <span className={`font-medium ${
                                passwordStrength.strength < 3 ? 'text-red-600' :
                                passwordStrength.strength < 4 ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                {passwordStrength.label}
                              </span>
                            </div>
                            <div className="flex space-x-1">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                  key={i}
                                  className={`h-2 flex-1 rounded ${
                                    i <= passwordStrength.strength
                                      ? passwordStrength.color
                                      : 'bg-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                            {passwordStrength.feedback && (
                              <Alert className="border-blue-200 bg-blue-50">
                                <Info className="h-4 w-4 text-blue-600" />
                                <AlertDescription className="text-blue-800 text-sm">
                                  <span className="font-medium">Voeg toe: </span>
                                  {passwordStrength.feedback.join(', ')}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        )}
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
                disabled={loading || success || message.includes('Reset sessie is ongeldig')}
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
                ) : message.includes('Reset sessie is ongeldig') ? (
                  'Sessie ongeldig'
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Wachtwoord bijwerken
                  </>
                )}
              </Button>

              {/* Password strength warning for weak passwords */}
              {passwordStrength.strength < 3 && form.watch('password') && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-sm">
                    <span className="font-medium">Tip: </span>
                    Een sterker wachtwoord beschermt uw account beter tegen inbraak.
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </Form>

          {!success && (
            <div className="mt-4 text-center space-y-2">
              {message.includes('Reset sessie is ongeldig') && (
                <Button
                  onClick={() => router.push('/auth/reset-password')}
                  variant="outline"
                  className="w-full"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Nieuwe reset aanvragen
                </Button>
              )}
              <button
                type="button"
                onClick={() => router.push('/auth')}
                className="text-sm text-blue-600 hover:underline block w-full"
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