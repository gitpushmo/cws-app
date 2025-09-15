import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import LogoutButton from '@/components/auth/logout-button'

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
                0
              </div>
              <Button className="w-full">
                Bekijk Wachtrij
              </Button>
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
                0
              </div>
              <Button variant="outline" className="w-full">
                Doorgaan met Werk
              </Button>
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
                0
              </div>
              <Button variant="outline" className="w-full">
                Bekijk Gereed
              </Button>
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