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
import { ArrowLeft, Euro, Clock, User } from 'lucide-react'

export default async function AdminPricingQueuePage() {
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

  // Get quotes ready for pricing
  const { data: quotes } = await supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      created_at,
      total_cutting_price,
      production_time_hours,
      profiles!quotes_customer_id_fkey (
        name,
        company_name
      ),
      operator:profiles!quotes_operator_id_fkey (
        name
      ),
      line_items (
        id,
        dxf_file_name,
        quantity,
        cutting_price,
        materials (
          name,
          thickness_mm
        )
      )
    `)
    .eq('status', 'ready_for_pricing')
    .order('created_at', { ascending: true })

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '€0.00'
    return `€${amount.toFixed(2)}`
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
                  Terug
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Pricing Queue
              </h1>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {quotes?.length || 0} klaar voor pricing
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!quotes || quotes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Euro className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Geen offertes klaar voor pricing
              </h3>
              <p className="text-gray-600">
                Er zijn momenteel geen offertes die pricing nodig hebben.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Offertes Klaar voor Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Offerte Nr.</TableHead>
                    <TableHead>Klant</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Snij Prijs</TableHead>
                    <TableHead>Productie Tijd</TableHead>
                    <TableHead>Verwerkt</TableHead>
                    <TableHead>Actie</TableHead>
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
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {quote.operator?.name || 'Onbekend'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {quote.line_items?.length || 0} items
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Euro className="h-4 w-4 text-green-600" />
                          <span className="font-medium">
                            {formatCurrency(quote.total_cutting_price)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span>
                            {quote.production_time_hours?.toFixed(1) || '0.0'}h
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {formatDateTime(quote.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/quote/${quote.id}/pricing`}>
                          <Button size="sm">
                            Prijs Instellen
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}