'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Loader2, Eye, EyeOff, Mail } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 tekens zijn'),
})

const registerSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 tekens zijn'),
  name: z.string().min(2, 'Naam moet minimaal 2 tekens zijn'),
  phone: z.string().min(10, 'Telefoonnummer moet minimaal 10 tekens zijn'),
  company_name: z.string().optional(),
  // Invoice address (required)
  invoice_street: z.string().min(1, 'Straat is verplicht'),
  invoice_city: z.string().min(1, 'Stad is verplicht'),
  invoice_postal_code: z.string().min(1, 'Postcode is verplicht'),
  invoice_country: z.string().min(1, 'Land is verplicht'),
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>
type AuthForm = LoginForm & Partial<Pick<RegisterForm, 'name' | 'phone' | 'company_name' | 'invoice_street' | 'invoice_city' | 'invoice_postal_code' | 'invoice_country'>>

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  // const supabase = createClient() // Currently using API endpoints instead

  useEffect(() => {
    // Show success message if coming from email verification
    if (searchParams.get('verified') === 'true') {
      setMessage('E-mail succesvol geverifieerd! Welkom bij CWS. U kunt nu inloggen met uw gegevens.')
    }

    // Show success message if coming from password update
    if (searchParams.get('updated') === 'true') {
      setMessage('Wachtwoord succesvol bijgewerkt! Log in met uw nieuwe wachtwoord om door te gaan.')
    }

    // Show success message if coming from signup completion
    if (searchParams.get('signup') === 'complete') {
      setMessage('Account succesvol aangemaakt en geverifieerd! U kunt nu inloggen.')
    }

    // Handle various error scenarios
    const error = searchParams.get('error')
    if (error) {
      switch (error) {
        case 'profile_not_found':
          setMessage('Er is een probleem met uw accountgegevens. Probeer opnieuw in te loggen of neem contact op.')
          break
        case 'email_not_verified':
          setMessage('Uw e-mailadres is nog niet geverifieerd. Controleer uw inbox en klik op de verificatielink.')
          break
        case 'invalid_session':
          setMessage('Uw sessie is verlopen. Log opnieuw in om door te gaan.')
          break
        case 'account_disabled':
          setMessage('Uw account is tijdelijk gedeactiveerd. Neem contact op voor meer informatie.')
          break
        default:
          setMessage('Er is een probleem opgetreden. Probeer het opnieuw.')
      }
    }
  }, [searchParams])

  const form = useForm<AuthForm>({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      phone: '',
      company_name: '',
      invoice_street: '',
      invoice_city: '',
      invoice_postal_code: '',
      invoice_country: '',
    },
  })

  async function onSubmit(values: AuthForm) {
    setLoading(true)
    setMessage('')

    try {
      if (isLogin) {
        // Use the new login API endpoint
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: values.email,
            password: values.password,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          // Provide more specific error messages based on backend response
          if (result.error_type) {
            switch (result.error_type) {
              case 'email_not_verified':
                setMessage('Uw e-mailadres is nog niet geverifieerd. Controleer uw inbox en klik op de verificatielink voordat u inlogt.')
                break
              case 'invalid_credentials':
                setMessage('E-mailadres of wachtwoord is onjuist. Controleer uw gegevens en probeer het opnieuw.')
                break
              case 'too_many_attempts':
                setMessage('Te veel inlogpogingen. Wacht een paar minuten voordat u het opnieuw probeert.')
                break
              case 'account_locked':
                setMessage('Uw account is tijdelijk vergrendeld vanwege verdachte activiteit. Probeer later opnieuw.')
                break
              default:
                setMessage(result.error || 'Er is een probleem opgetreden tijdens het inloggen.')
            }
          } else {
            setMessage(result.error || 'Er is een probleem opgetreden tijdens het inloggen.')
          }
          return
        }

        // Login successful - redirect will be handled by middleware
        window.location.href = '/'
      } else {
        // Use the new signup API endpoint
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: values.email,
            password: values.password,
            name: values.name || '',
            phone: values.phone || '',
            company_name: values.company_name || '',
            invoice_address: {
              street: values.invoice_street || '',
              city: values.invoice_city || '',
              postal_code: values.invoice_postal_code || '',
              country: values.invoice_country || ''
            }
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          // Provide more specific signup error messages
          if (result.error_type) {
            switch (result.error_type) {
              case 'email_already_exists':
                setMessage('Dit e-mailadres is al geregistreerd. Probeer in te loggen of gebruik het wachtwoord vergeten formulier.')
                break
              case 'weak_password':
                setMessage('Wachtwoord is te zwak. Gebruik minimaal 6 tekens met een mix van letters en cijfers.')
                break
              case 'invalid_email':
                setMessage('E-mailadres is ongeldig. Controleer het formaat en probeer het opnieuw.')
                break
              case 'profile_creation_failed':
                setMessage('Er ging iets mis bij het aanmaken van uw profiel. Probeer het opnieuw.')
                break
              default:
                setMessage(result.error || 'Er is een probleem opgetreden tijdens registratie.')
            }
          } else {
            setMessage(result.error || 'Er is een probleem opgetreden tijdens registratie.')
          }
          return
        }

        // Signup successful - redirect to check email page
        router.push(`/auth/check-email?email=${encodeURIComponent(values.email)}`)
      }
    } catch (error) {
      console.error('Auth error:', error)
      setMessage('Er is iets fout gegaan. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{isLogin ? 'Inloggen' : 'Registreren'}</CardTitle>
          <CardDescription>
            {isLogin
              ? 'Log in op uw CWS account'
              : 'Maak een nieuw CWS account aan'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!isLogin && (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Naam</FormLabel>
                        <FormControl>
                          <Input placeholder="Uw volledige naam" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefoon</FormLabel>
                        <FormControl>
                          <Input placeholder="06-12345678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bedrijfsnaam (optioneel)</FormLabel>
                        <FormControl>
                          <Input placeholder="Uw bedrijfsnaam" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Factuuradres (verplicht)</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="invoice_street"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Straat + huisnummer</FormLabel>
                            <FormControl>
                              <Input placeholder="Hoofdstraat 123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="invoice_postal_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postcode</FormLabel>
                            <FormControl>
                              <Input placeholder="1234 AB" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="invoice_city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stad</FormLabel>
                            <FormControl>
                              <Input placeholder="Amsterdam" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="invoice_country"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Land</FormLabel>
                            <FormControl>
                              <Input placeholder="Nederland" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </>
              )}

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

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wachtwoord</FormLabel>
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

              {message && (
                <div className="space-y-3">
                  <Alert className={`${
                    message.includes('succesvol geverifieerd') || message.includes('aangemaakt') || message.includes('bijgewerkt')
                      ? 'border-green-200 bg-green-50'
                      : message.includes('niet geverifieerd')
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-red-200 bg-red-50'
                  }`}>
                    {message.includes('succesvol geverifieerd') || message.includes('aangemaakt') || message.includes('bijgewerkt') ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : message.includes('niet geverifieerd') ? (
                      <Mail className="h-4 w-4 text-blue-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={`${
                      message.includes('succesvol geverifieerd') || message.includes('aangemaakt') || message.includes('bijgewerkt')
                        ? 'text-green-800'
                        : message.includes('niet geverifieerd')
                        ? 'text-blue-800'
                        : 'text-red-800'
                    }`}>
                      {message}
                    </AlertDescription>
                  </Alert>

                  {/* Show helpful action buttons for specific scenarios */}
                  {message.includes('niet geverifieerd') && (
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push('/auth/verification-error')}
                      >
                        Hulp bij verificatie
                      </Button>
                    </div>
                  )}

                  {message.includes('al geregistreerd') && (
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setIsLogin(true)
                          setMessage('')
                        }}
                      >
                        Ga naar inloggen
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push('/auth/reset-password')}
                      >
                        Wachtwoord vergeten?
                      </Button>
                    </div>
                  )}

                  {message.includes('account is tijdelijk gedeactiveerd') && (
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.location.href = 'mailto:support@cws.com'}
                      >
                        Contact opnemen
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLogin ? 'Bezig met inloggen...' : 'Account wordt aangemaakt...'}
                  </>
                ) : (
                  isLogin ? 'Inloggen' : 'Registreren'
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center space-y-2">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                form.reset()
                setMessage('')
                setShowPassword(false)
              }}
              className="text-sm text-blue-600 hover:underline block w-full"
            >
              {isLogin
                ? 'Nog geen account? Registreer hier'
                : 'Al een account? Log hier in'
              }
            </button>

            {isLogin && (
              <button
                type="button"
                onClick={() => router.push('/auth/reset-password')}
                className="text-sm text-gray-600 hover:underline block w-full"
              >
                Wachtwoord vergeten?
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}