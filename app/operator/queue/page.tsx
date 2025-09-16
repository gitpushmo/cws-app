import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import QuoteStatusProgress from '@/components/quote/quote-status-progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import Link from 'next/link'
import { ArrowLeft, Clock, FileText } from 'lucide-react'

export default async function OperatorQueuePage() {
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
  const { data: quotes } = await supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      status,
      created_at,
      deadline,
      notes,
      profiles!quotes_customer_id_fkey (
        name,
        company_name
      ),
      line_items (
        id,
        dxf_file_name
      )
    `)
    .is('operator_id', null)
    .eq('status', 'pending')
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/operator">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Terug
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Offerte Wachtrij
              </h1>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {quotes?.length || 0} openstaand
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
                Geen openstaande offertes
              </h3>
              <p className="text-gray-600">
                Er zijn momenteel geen offertes die beoordeling nodig hebben.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Openstaande Offertes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Offerte Nr.</TableHead>
                    <TableHead>Klant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>DXF Files</TableHead>
                    <TableHead>Ontvangen</TableHead>
                    <TableHead>Deadline</TableHead>
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
                        <QuoteStatusProgress
                          status={quote.status}
                          showProgress={false}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span>{quote.line_items?.length || 0} files</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDateTime(quote.created_at)}
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
                        <Link href={`/operator/quote/${quote.id}`}>
                          <Button size="sm">
                            Beoordeel
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