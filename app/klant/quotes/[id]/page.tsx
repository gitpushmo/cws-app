import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileText, Image } from 'lucide-react'
import Link from 'next/link'
import SecureFileDownloadButton from '@/components/quote/secure-file-download-button'
import CommentThread from '@/components/quote/comment-thread'
import CustomerQuoteActions from '@/components/quote/customer-quote-actions'

interface QuoteParams {
  id: string
}

interface Quote {
  id: number
  quote_number: string
  status: string
  notes?: string
  deadline?: string
  total_customer_price?: number
  shipping_address: {
    street: string
    city: string
    postal_code: string
    country: string
  }
  created_at: string
  updated_at: string
  customer_id: string
  operator_id?: string
  line_items: {
    id: number
    dxf_file_url?: string
    dxf_file_name?: string
    pdf_file_url?: string
    pdf_file_name?: string
    quantity: number
  }[]
}

const statusLabels: Record<string, string> = {
  pending: 'In behandeling',
  quoted: 'Offerte verstuurd',
  accepted: 'Geaccepteerd',
  rejected: 'Afgewezen',
  completed: 'Voltooid',
  cancelled: 'Geannuleerd'
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  quoted: 'outline',
  accepted: 'default',
  rejected: 'destructive',
  completed: 'default',
  cancelled: 'destructive'
}

export default async function QuoteDetailPage({ params }: { params: Promise<QuoteParams> }) {
  const resolvedParams = await params
  const quoteId = parseInt(resolvedParams.id)

  if (isNaN(quoteId)) {
    notFound()
  }

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

  // Get quote details
  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      status,
      notes,
      deadline,
      total_customer_price,
      shipping_address,
      created_at,
      updated_at,
      customer_id,
      operator_id,
      line_items (
        id,
        dxf_file_url,
        dxf_file_name,
        pdf_file_url,
        pdf_file_name,
        quantity
      )
    `)
    .eq('id', quoteId)
    .single() as { data: Quote | null, error: unknown }

  if (error || !quote) {
    notFound()
  }

  // Check if user owns this quote
  if (quote.customer_id !== user.id) {
    redirect('/klant')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }



  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link href="/klant">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Terug naar Dashboard
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {quote.quote_number}
                </h1>
                <p className="text-sm text-gray-600">
                  Aangemaakt op {formatDate(quote.created_at)}
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Welkom, {profile.name}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quote Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Status</CardTitle>
                  <Badge variant={statusColors[quote.status] || 'outline'} className="text-sm">
                    {statusLabels[quote.status] || quote.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quote.notes && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-700">Opmerkingen</h4>
                      <p className="text-sm text-gray-600 mt-1">{quote.notes}</p>
                    </div>
                  )}
                  {quote.deadline && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-700">Gewenste opleverdatum</h4>
                      <p className="text-sm text-gray-600 mt-1">{formatDate(quote.deadline)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Files */}
            <Card>
              <CardHeader>
                <CardTitle>Geüploade Bestanden</CardTitle>
                <CardDescription>
                  Uw DXF bestanden en technische tekeningen
                </CardDescription>
              </CardHeader>
              <CardContent>
                {quote.line_items.length === 0 ? (
                  <p className="text-gray-600 text-sm">Geen bestanden gevonden</p>
                ) : (
                  <div className="space-y-3">
                    {quote.line_items.map((item) => (
                      <div key={item.id} className="space-y-2">
                        {/* DXF File */}
                        {item.dxf_file_name && (
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Image className="h-5 w-5 text-blue-600" />
                              <div>
                                <p className="font-medium text-sm">{item.dxf_file_name}</p>
                                <p className="text-xs text-gray-600">
                                  DXF Bestand • Aantal: {item.quantity}
                                </p>
                              </div>
                            </div>
                            {item.dxf_file_url && (
                              <SecureFileDownloadButton
                                fileName={item.dxf_file_name}
                                filePath={item.dxf_file_url}
                                bucket="dxf-files"
                                quoteId={quote.id}
                              />
                            )}
                          </div>
                        )}

                        {/* PDF File */}
                        {item.pdf_file_name && (
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-5 w-5 text-red-600" />
                              <div>
                                <p className="font-medium text-sm">{item.pdf_file_name}</p>
                                <p className="text-xs text-gray-600">PDF Tekening</p>
                              </div>
                            </div>
                            {item.pdf_file_url && (
                              <SecureFileDownloadButton
                                fileName={item.pdf_file_name}
                                filePath={item.pdf_file_url}
                                bucket="pdf-files"
                                quoteId={quote.id}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments Thread */}
            <CommentThread
              quoteId={quote.id.toString()}
              userRole={profile.role as 'customer' | 'operator' | 'admin'}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Offerte Actie</CardTitle>
              </CardHeader>
              <CardContent>
                <CustomerQuoteActions quote={{
                  id: quote.id,
                  status: quote.status,
                  quote_number: quote.quote_number,
                  total_customer_price: quote.total_customer_price
                }} />
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle>Verzendadres</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <p>{quote.shipping_address.street}</p>
                  <p>{quote.shipping_address.postal_code} {quote.shipping_address.city}</p>
                  <p>{quote.shipping_address.country}</p>
                </div>
              </CardContent>
            </Card>

            {/* Quote Details */}
            <Card>
              <CardHeader>
                <CardTitle>Offerte Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Offerte#:</span>
                    <span className="font-medium">{quote.quote_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Aangemaakt:</span>
                    <span>{formatDate(quote.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Laatst bijgewerkt:</span>
                    <span>{formatDate(quote.updated_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">DXF Bestanden:</span>
                    <span>{quote.line_items.filter(item => item.dxf_file_name).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">PDF Bestanden:</span>
                    <span>{quote.line_items.filter(item => item.pdf_file_name).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}