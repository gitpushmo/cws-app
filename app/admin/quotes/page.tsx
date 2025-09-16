import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Eye, FileText, Filter, Download } from 'lucide-react'
import Link from 'next/link'
import LogoutButton from '@/components/auth/logout-button'

interface Quote {
  id: number
  quote_number: string
  revision_number: number
  status: 'pending' | 'needs_attention' | 'ready_for_pricing' | 'sent' | 'accepted' | 'done' | 'declined' | 'expired'
  notes?: string
  deadline?: string
  total_cutting_price?: number
  total_customer_price?: number
  created_at: string
  updated_at: string
  sent_at?: string
  accepted_at?: string
  declined_at?: string
  profiles: {
    name: string
    company_name?: string
    email: string
  } | null
  operator_profile?: {
    name: string
  } | null
}

function getStatusBadge(status: Quote['status']) {
  const statusConfig = {
    pending: { label: 'Nieuw', variant: 'default' as const },
    needs_attention: { label: 'Aandacht Nodig', variant: 'destructive' as const },
    ready_for_pricing: { label: 'Klaar voor Pricing', variant: 'secondary' as const },
    sent: { label: 'Verzonden', variant: 'outline' as const },
    accepted: { label: 'Geaccepteerd', variant: 'default' as const },
    done: { label: 'Voltooid', variant: 'default' as const },
    declined: { label: 'Afgewezen', variant: 'destructive' as const },
    expired: { label: 'Verlopen', variant: 'outline' as const },
  }
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export default async function AdminAllQuotesPage() {
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

  // Get ALL quotes with customer and operator information
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      revision_number,
      status,
      notes,
      deadline,
      total_cutting_price,
      total_customer_price,
      created_at,
      updated_at,
      sent_at,
      accepted_at,
      declined_at,
      profiles!quotes_customer_id_fkey (
        name,
        company_name,
        email
      ),
      operator_profile:profiles!quotes_operator_id_fkey (
        name
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching quotes:', error)
  }

  // Calculate summary statistics
  const totalQuotes = quotes?.length || 0
  const pendingQuotes = quotes?.filter(q => q.status === 'pending').length || 0
  const readyForPricingQuotes = quotes?.filter(q => q.status === 'ready_for_pricing').length || 0
  const sentQuotes = quotes?.filter(q => q.status === 'sent').length || 0
  const acceptedQuotes = quotes?.filter(q => q.status === 'accepted').length || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  ← Terug naar Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Alle Offertes
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filteren
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Exporteren
              </Button>
              <span className="text-sm text-gray-600">
                Welkom, {profile.name}
              </span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{totalQuotes}</div>
              <p className="text-sm text-gray-600">Totaal Offertes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-orange-600">{pendingQuotes}</div>
              <p className="text-sm text-gray-600">Nieuw</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{readyForPricingQuotes}</div>
              <p className="text-sm text-gray-600">Klaar voor Pricing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">{sentQuotes}</div>
              <p className="text-sm text-gray-600">Verzonden</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{acceptedQuotes}</div>
              <p className="text-sm text-gray-600">Geaccepteerd</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Quotes Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Alle Offertes Overzicht
            </CardTitle>
            <CardDescription>
              Volledig overzicht van alle quotes met filtering en export mogelijkheden
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!quotes || quotes.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Geen offertes gevonden.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quote Nummer</TableHead>
                      <TableHead>Klant</TableHead>
                      <TableHead>Bedrijf</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Operator</TableHead>
                      <TableHead>Snijprijs</TableHead>
                      <TableHead>Klantprijs</TableHead>
                      <TableHead>Aangemaakt</TableHead>
                      <TableHead>Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell className="font-medium">
                          {quote.quote_number}
                          {quote.revision_number > 0 && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              R{quote.revision_number}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{quote.profiles?.name}</div>
                            <div className="text-sm text-gray-500">{quote.profiles?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {quote.profiles?.company_name || '-'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(quote.status)}
                        </TableCell>
                        <TableCell>
                          {quote.operator_profile?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {quote.total_cutting_price
                            ? `€${quote.total_cutting_price.toFixed(2)}`
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {quote.total_customer_price
                            ? `€${quote.total_customer_price.toFixed(2)}`
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {new Date(quote.created_at).toLocaleDateString('nl-NL')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Link href={`/admin/quotes/${quote.id}`}>
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Snelle Acties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" asChild>
                <Link href="/admin/pricing-queue">
                  Pricing Wachtrij ({readyForPricingQuotes})
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/sent-quotes">
                  Verzonden Offertes ({sentQuotes})
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/accepted-quotes">
                  Geaccepteerde Offertes ({acceptedQuotes})
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Beheer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/materials">
                  Materialen Beheren
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Klanten Beheren
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Operators Beheren
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rapportages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                Omzet Overzicht
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Quote Statistieken
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