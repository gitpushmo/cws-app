import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import LogoutButton from '@/components/auth/logout-button'
import Link from 'next/link'

export default async function AdminDashboard() {
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

  if (!profile || profile.role !== 'admin') {
    redirect('/auth')
  }

  // Get quote counts by status
  const { data: readyForPricingQuotes } = await supabase
    .from('quotes')
    .select('id, quote_number, created_at')
    .eq('status', 'ready_for_pricing')
    .order('created_at', { ascending: true })

  const { data: sentQuotes } = await supabase
    .from('quotes')
    .select('id, quote_number, sent_at')
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })

  const { data: acceptedQuotes } = await supabase
    .from('quotes')
    .select('id, quote_number, accepted_at')
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false })

  const { data: activeOrders } = await supabase
    .from('orders')
    .select('id, order_number, status')
    .in('status', ['pending', 'in_production'])
    .order('created_at', { ascending: false })

  // Get ALL quotes for admin overview (as per specification: "Admin: All quotes with filters")
  const { data: allQuotes } = await supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      status,
      created_at,
      profiles!quotes_customer_id_fkey (
        name,
        company_name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10) // Show latest 10 for dashboard overview

  const readyForPricingCount = readyForPricingQuotes?.length || 0
  const sentCount = sentQuotes?.length || 0
  const acceptedCount = acceptedQuotes?.length || 0
  const activeOrdersCount = activeOrders?.length || 0
  const totalQuotes = allQuotes?.length || 0


  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Admin Dashboard
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Wacht op Pricing</CardTitle>
              <CardDescription>
                Offertes klaar voor prijsbepaling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {readyForPricingCount}
              </div>
              <Link href="/admin/pricing-queue">
                <Button className="w-full" disabled={readyForPricingCount === 0}>
                  Prijs Instellen
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verzonden Offertes</CardTitle>
              <CardDescription>
                Offertes wachtend op klant reactie
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {sentCount}
              </div>
              <Link href="/admin/sent-quotes">
                <Button variant="outline" className="w-full" disabled={sentCount === 0}>
                  Bekijk Status
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Geaccepteerde Offertes</CardTitle>
              <CardDescription>
                Klaar voor betaling verwerken
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {acceptedCount}
              </div>
              <Link href="/admin/accepted-quotes">
                <Button variant="outline" className="w-full" disabled={acceptedCount === 0}>
                  Verwerk Betaling
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actieve Orders</CardTitle>
              <CardDescription>
                Orders in productie
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {activeOrdersCount}
              </div>
              <Link href="/admin/orders">
                <Button variant="outline" className="w-full" disabled={activeOrdersCount === 0}>
                  Bekijk Orders
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Alle Offertes</CardTitle>
              <CardDescription>Recente offertes (alle statussen)</CardDescription>
            </CardHeader>
            <CardContent>
              {!allQuotes || allQuotes.length === 0 ? (
                <p className="text-gray-600">Geen offertes gevonden.</p>
              ) : (
                <div className="space-y-2">
                  {allQuotes.map((quote) => (
                    <div key={quote.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{quote.quote_number}</span>
                        <span className="text-sm text-gray-600 ml-2">
                          {quote.profiles?.name}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          quote.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                          quote.status === 'needs_attention' ? 'bg-orange-100 text-orange-800' :
                          quote.status === 'ready_for_pricing' ? 'bg-yellow-100 text-yellow-800' :
                          quote.status === 'sent' ? 'bg-purple-100 text-purple-800' :
                          quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {quote.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  <Link href="/admin/quotes">
                    <Button variant="outline" className="w-full mt-2">
                      Alle Offertes Bekijken
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gebruikersbeheer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                Klanten Beheren
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Operators Beheren
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Materialen Beheren
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Rapportages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                Omzet Overzicht
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Quote Statistics
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Operator Performance
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}