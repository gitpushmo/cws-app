import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import LogoutButton from '@/components/auth/logout-button'
import Link from 'next/link'

export default async function OperatorDashboard() {
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

  if (!profile || profile.role !== 'operator') {
    redirect('/auth')
  }

  // Get unassigned pending quotes available to claim
  const { data: pendingQuotes } = await supabase
    .from('quotes')
    .select('id, quote_number, status, created_at')
    .is('operator_id', null)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  // Get quotes assigned to this operator that need attention
  const { data: inProgressQuotes } = await supabase
    .from('quotes')
    .select('id, quote_number, status, created_at')
    .eq('operator_id', user.id)
    .eq('status', 'needs_attention')
    .order('created_at', { ascending: true })

  // Get quotes this operator completed and are ready for pricing
  const { data: readyQuotes } = await supabase
    .from('quotes')
    .select('id, quote_number, status, created_at')
    .eq('operator_id', user.id)
    .eq('status', 'ready_for_pricing')
    .order('created_at', { ascending: true })

  const pendingCount = pendingQuotes?.length || 0
  const inProgressCount = inProgressQuotes?.length || 0
  const readyCount = readyQuotes?.length || 0


  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Operator Dashboard
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Openstaande Offertes</CardTitle>
              <CardDescription>
                Offertes die beoordeling nodig hebben
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {pendingCount}
              </div>
              <Link href="/operator/queue">
                <Button className="w-full" disabled={pendingCount === 0}>
                  Bekijk Wachtrij
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>In Behandeling</CardTitle>
              <CardDescription>
                Offertes die u aan het bewerken bent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {inProgressCount}
              </div>
              <Link href="/operator/in-progress">
                <Button variant="outline" className="w-full" disabled={inProgressCount === 0}>
                  Doorgaan met Werk
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gereed voor Pricing</CardTitle>
              <CardDescription>
                Offertes klaar voor admin pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {readyCount}
              </div>
              <Link href="/operator/ready">
                <Button variant="outline" className="w-full" disabled={readyCount === 0}>
                  Bekijk Gereed
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recente Activiteit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Geen recente activiteit gevonden.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}