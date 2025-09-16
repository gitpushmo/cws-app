import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Eye, Package, Truck } from 'lucide-react'
import Link from 'next/link'
import LogoutButton from '@/components/auth/logout-button'

interface Order {
  id: number
  order_number: string
  status: 'pending' | 'in_production' | 'completed' | 'shipped'
  payment_status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'
  total_amount: number
  created_at: string
  production_started_at?: string
  production_completed_at?: string
  shipped_at?: string
  shipping_tracking_number?: string
  quote_id: number
  quotes: {
    quote_number: string
    notes?: string
  }
}

function getStatusBadge(status: Order['status']) {
  const statusConfig = {
    pending: { label: 'Wachtend', variant: 'default' as const },
    in_production: { label: 'In Productie', variant: 'secondary' as const },
    completed: { label: 'Voltooid', variant: 'default' as const },
    shipped: { label: 'Verzonden', variant: 'default' as const },
  }
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

function getPaymentStatusBadge(status: Order['payment_status']) {
  const statusConfig = {
    pending: { label: 'Wachtend', variant: 'outline' as const },
    processing: { label: 'Verwerking', variant: 'secondary' as const },
    paid: { label: 'Betaald', variant: 'default' as const },
    failed: { label: 'Mislukt', variant: 'destructive' as const },
    refunded: { label: 'Terugbetaald', variant: 'outline' as const },
  }
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export default async function CustomerOrdersPage() {
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

  // Get customer orders
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      payment_status,
      total_amount,
      created_at,
      production_started_at,
      production_completed_at,
      shipped_at,
      shipping_tracking_number,
      quote_id,
      quotes!orders_quote_id_fkey (
        quote_number,
        notes
      )
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching orders:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/klant">
                <Button variant="outline" size="sm">
                  ← Terug naar Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Mijn Bestellingen
              </h1>
            </div>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Uw Bestellingen
            </CardTitle>
            <CardDescription>
              Overzicht van al uw geplaatste orders en hun status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!orders || orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  U heeft nog geen bestellingen geplaatst.
                </p>
                <Button asChild>
                  <Link href="/klant/quotes/new">
                    Vraag een Offerte Aan
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Nummer</TableHead>
                      <TableHead>Offerte</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Betaling</TableHead>
                      <TableHead>Bedrag</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          <Link href={`/klant/quotes/${order.quote_id}`} className="text-blue-600 hover:underline">
                            {order.quotes?.quote_number}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(order.payment_status)}
                        </TableCell>
                        <TableCell>
                          €{order.total_amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString('nl-NL')}
                        </TableCell>
                        <TableCell>
                          {order.shipping_tracking_number ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <Truck className="h-4 w-4" />
                              <span className="text-sm">{order.shipping_tracking_number}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Nog niet verzonden</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link href={`/klant/quotes/${order.quote_id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              Bekijk
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {orders && orders.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Totaal Bestellingen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orders.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">In Productie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {orders.filter(order => order.status === 'in_production').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Verzonden</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {orders.filter(order => order.status === 'shipped').length}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}