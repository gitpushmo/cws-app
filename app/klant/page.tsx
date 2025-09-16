import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import LogoutButton from '@/components/auth/logout-button'
import CustomerQuoteList from '@/components/quote/customer-quote-list'
import ScrollToButton from '@/components/ui/scroll-to-button'
import Link from 'next/link'

export default async function KlantDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'customer') {
    redirect('/auth')
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Klant Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welkom, {profile.name}
              </span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Nieuwe Offerte</CardTitle>
              <CardDescription>
                Vraag een offerte aan voor waterjet snijden
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/klant/offerte/nieuw">
                  Offerte Aanvragen
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mijn Offertes</CardTitle>
              <CardDescription>
                Bekijk de status van uw offertes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollToButton targetId="quotes-list" variant="outline" className="w-full">
                Offertes Bekijken
              </ScrollToButton>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mijn Orders</CardTitle>
              <CardDescription>
                Volg uw bestellingen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/klant/bestellingen">
                  Orders Bekijken
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div id="quotes-list">
          <CustomerQuoteList />
        </div>
      </main>
    </div>
  )
}