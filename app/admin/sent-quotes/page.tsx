import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import Link from 'next/link'
import { ArrowLeft, Clock, Euro } from 'lucide-react'

export default async function SentQuotesPage() {
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

  // Get sent quotes
  const { data: quotes } = await supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      status,
      sent_at,
      total_price,
      deadline,
      profiles!quotes_customer_id_fkey (
        name,
        company_name,
        email
      ),
      line_items (
        id
      )
    `)
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price: number | null) => {
    if (!price) return '-'
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Terug naar Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Verzonden Offertes
              </h1>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {quotes?.length || 0} verzonden
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!quotes || quotes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Geen verzonden offertes
              </h3>
              <p className="text-gray-600">
                Er zijn momenteel geen offertes verzonden naar klanten.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Verzonden Offertes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Offerte Nr.</TableHead>
                      <TableHead>Klant</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Verzonden</TableHead>
                      <TableHead>Prijs</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell className="font-medium">
                          {quote.quote_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {quote.profiles?.name}
                            </div>
                            {quote.profiles?.company_name && (
                              <div className="text-sm text-gray-600">
                                {quote.profiles.company_name}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {quote.profiles?.email}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(quote.sent_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Euro className="h-4 w-4 text-green-600" />
                            <span className="font-medium">
                              {formatPrice(quote.total_price)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {quote.line_items?.length || 0} items
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {quote.deadline ? (
                            <span className="text-orange-600">
                              {formatDateTime(quote.deadline)}
                            </span>
                          ) : (
                            <span className="text-gray-400">Geen deadline</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            Wacht op reactie
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Link href={`/admin/quotes/${quote.id}`}>
                              <Button size="sm" variant="outline">
                                Details
                              </Button>
                            </Link>
                            <Button size="sm" variant="outline">
                              Herinnering
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}