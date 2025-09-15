'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

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

  const supabase = createClient()

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
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        })

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setMessage('Ongeldige e-mail of wachtwoord')
          } else if (error.message.includes('Email not confirmed')) {
            setMessage('Bevestig eerst uw e-mail voordat u inlogt')
          } else {
            setMessage('Fout bij inloggen: ' + error.message)
          }
          return
        }

        // Redirect will be handled by middleware
        window.location.href = '/'
      } else {
        // Sign up - pass metadata for the trigger to use
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: {
              name: values.name || '',
              phone: values.phone || '',
              company_name: values.company_name || '',
              invoice_address: {
                street: values.invoice_street || '',
                city: values.invoice_city || '',
                postal_code: values.invoice_postal_code || '',
                country: values.invoice_country || ''
              }
            }
          }
        })

        if (error) {
          if (error.message.includes('User already registered')) {
            setMessage('Dit e-mailadres is al geregistreerd. Probeer in te loggen.')
          } else if (error.message.includes('Password should be at least')) {
            setMessage('Wachtwoord moet minimaal 6 tekens lang zijn')
          } else {
            setMessage('Fout bij registreren: ' + error.message)
          }
          return
        }

        if (data.user) {
          setMessage('Account aangemaakt! Check je e-mail voor verificatie.')
        }
      }
    } catch {
      setMessage('Er is iets fout gegaan')
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
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {message && (
                <div className={`text-sm p-3 rounded ${
                  message.includes('aangemaakt')
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}>
                  {message}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Bezig...' : (isLogin ? 'Inloggen' : 'Registreren')}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                form.reset()
                setMessage('')
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              {isLogin
                ? 'Nog geen account? Registreer hier'
                : 'Al een account? Log hier in'
              }
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}