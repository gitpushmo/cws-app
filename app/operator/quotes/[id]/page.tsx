import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import QuoteProcessingForm from '@/components/operator/quote-processing-form'
import QuoteFilesList from '@/components/quote/quote-files-list'
import CommentThread from '@/components/quote/comment-thread'
import QuoteStatusProgress from '@/components/quote/quote-status-progress'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function OperatorQuoteDetailPage({ params }: PageProps) {
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

  if (!profile || profile.role !== 'operator') {
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
      production_time_hours,
      shipping_address,
      operator_id,
      profiles!quotes_customer_id_fkey (
        name,
        email,
        company_name,
        phone
      ),
      line_items (
        id,
        dxf_file_url,
        dxf_file_name,
        pdf_file_url,
        pdf_file_name,
        quantity,
        cutting_price,
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

  // Operators can only access quotes that are either:
  // 1. Assigned to them, or
  // 2. Unassigned (available for claiming)
  if (quote.operator_id && quote.operator_id !== user.id) {
    notFound()
  }

  // Get available materials
  const { data: materials } = await supabase
    .from('materials')
    .select('*')
    .eq('is_active', true)
    .order('name')

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary'
      case 'needs_attention':
        return 'destructive'
      case 'ready_for_pricing':
        return 'default'
      default:
        return 'outline'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Wacht op Beoordeling'
      case 'needs_attention':
        return 'Aandacht Vereist'
      case 'ready_for_pricing':
        return 'Klaar voor Pricing'
      default:
        return status
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/operator/queue">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Terug naar Wachtrij
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                {quote.quote_number}
                {quote.revision_number > 0 && `-R${quote.revision_number}`}
              </h1>
            </div>
            <Badge variant={getStatusBadgeVariant(quote.status)}>
              {getStatusText(quote.status)}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Quote Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
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
                <div>
                  <span className="font-medium">Ontvangen:</span> {formatDateTime(quote.created_at)}
                </div>
                {quote.deadline && (
                  <div>
                    <span className="font-medium">Deadline:</span> {formatDateTime(quote.deadline)}
                  </div>
                )}
              </CardContent>
            </Card>

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
                  quoteId={quote.id}
                  userRole={profile.role}
                  canComment={['pending', 'needs_attention'].includes(quote.status)}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Processing Form */}
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

            <QuoteProcessingForm
              quote={quote}
              materials={materials || []}
              userRole={profile.role}
            />
          </div>
        </div>
      </main>
    </div>
  )
}