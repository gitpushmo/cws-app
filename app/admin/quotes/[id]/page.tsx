import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import QuoteFilesList from '@/components/quote/quote-files-list'
import CommentThread from '@/components/quote/comment-thread'
import QuoteStatusProgress from '@/components/quote/quote-status-progress'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AdminQuoteDetailPage({ params }: PageProps) {
  const { id } = await params;
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

  // Get quote with all related data
  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      revision_number,
      status,
      notes,
      deadline,
      created_at,
      total_cutting_price,
      total_customer_price,
      production_time_hours,
      shipping_address,
      profiles!quotes_customer_id_fkey (
        name,
        email,
        company_name,
        phone
      ),
      operator:profiles!quotes_operator_id_fkey (
        name,
        email
      ),
      line_items (
        id,
        dxf_file_url,
        dxf_file_name,
        pdf_file_url,
        pdf_file_name,
        quantity,
        cutting_price,
        customer_price,
        production_time_hours,
        material_id,
        materials (
          id,
          name,
          thickness_mm,
          price_per_sqm
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !quote) {
    notFound()
  }

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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Nieuw'
      case 'needs_attention': return 'Aandacht Vereist'
      case 'ready_for_pricing': return 'Klaar voor Pricing'
      case 'sent': return 'Verzonden'
      case 'accepted': return 'Geaccepteerd'
      case 'done': return 'Voltooid'
      case 'declined': return 'Afgewezen'
      case 'expired': return 'Verlopen'
      default: return status
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin/quotes">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Terug naar Overzicht
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Quote Details - {quote.quote_number}
                {quote.revision_number > 0 && `-R${quote.revision_number}`}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">
                {getStatusText(quote.status)}
              </Badge>
              {quote.status === 'ready_for_pricing' && (
                <Link href={`/admin/quotes/${quote.id}/pricing`}>
                  <Button>
                    Prijs Instellen
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Quote Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Operator Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Klantgegevens</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="font-medium">Naam:</span> {quote.profiles?.name}
                  </div>
                  {quote.profiles?.company_name && (
                    <div>
                      <span className="font-medium">Bedrijf:</span> {quote.profiles.company_name}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Email:</span> {quote.profiles?.email}
                  </div>
                  <div>
                    <span className="font-medium">Telefoon:</span> {quote.profiles?.phone}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Operator Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="font-medium">Naam:</span> {quote.operator?.name || 'Niet toegewezen'}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {quote.operator?.email || 'Niet toegewezen'}
                  </div>
                  <div>
                    <span className="font-medium">Aangemaakt op:</span> {formatDateTime(quote.created_at)}
                  </div>
                  {quote.deadline && (
                    <div>
                      <span className="font-medium">Deadline:</span> {formatDateTime(quote.deadline)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Pricing Summary (if available) */}
            {(quote.total_cutting_price || quote.total_customer_price || quote.production_time_hours) && (
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Overzicht</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {quote.total_cutting_price && (
                      <div className="text-center p-3 bg-blue-50 rounded">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(quote.total_cutting_price)}
                        </div>
                        <div className="text-sm text-gray-600">Totale Snij Prijs</div>
                      </div>
                    )}
                    {quote.total_customer_price && (
                      <div className="text-center p-3 bg-green-50 rounded">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(quote.total_customer_price)}
                        </div>
                        <div className="text-sm text-gray-600">Klantprijs</div>
                      </div>
                    )}
                    {quote.production_time_hours && (
                      <div className="text-center p-3 bg-purple-50 rounded">
                        <div className="text-2xl font-bold text-purple-600">
                          {quote.production_time_hours.toFixed(1)}h
                        </div>
                        <div className="text-sm text-gray-600">Productie Tijd</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Files */}
            <Card>
              <CardHeader>
                <CardTitle>Bestanden ({quote.line_items?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <QuoteFilesList lineItems={quote.line_items || []} />
              </CardContent>
            </Card>

            {/* Customer Notes */}
            {quote.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Klantopmerkingen</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{quote.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle>Communicatie</CardTitle>
              </CardHeader>
              <CardContent>
                <CommentThread
                  quoteId={quote.id.toString()}
                  userRole={profile.role}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Status & Actions */}
          <div className="space-y-6">
            {/* Status Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Voortgang</CardTitle>
              </CardHeader>
              <CardContent>
                <QuoteStatusProgress
                  status={quote.status}
                  showProgress={true}
                  size="md"
                />
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle>Verzendadres</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <p>{quote.shipping_address?.street}</p>
                  <p>{quote.shipping_address?.postal_code} {quote.shipping_address?.city}</p>
                  <p>{quote.shipping_address?.country}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}