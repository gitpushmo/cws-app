'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, Plus } from 'lucide-react'
import Link from 'next/link'

interface Quote {
  id: number
  quote_number: string
  status: string
  notes?: string
  deadline?: string
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

export default function CustomerQuoteList() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetchQuotes()
  }, [])

  const fetchQuotes = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/quotes')
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fout bij ophalen offertes')
      }

      const data = await response.json()
      setQuotes(data)
    } catch (err) {
      console.error('Error fetching quotes:', err)
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mijn Offertes</CardTitle>
          <CardDescription>
            Overzicht van uw offerteaanvragen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mijn Offertes</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            onClick={fetchQuotes}
            variant="outline"
            className="mt-4"
          >
            Opnieuw proberen
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Mijn Offertes</CardTitle>
            <CardDescription>
              Overzicht van uw offerteaanvragen ({quotes.length} {quotes.length === 1 ? 'offerte' : 'offertes'})
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/klant/offerte/nieuw">
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe Offerte
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {quotes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Nog geen offertes aangevraagd</p>
            <Button asChild>
              <Link href="/klant/offerte/nieuw">
                <Plus className="h-4 w-4 mr-2" />
                Eerste Offerte Aanvragen
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Offerte#</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
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
                      {formatDate(quote.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[quote.status] || 'outline'}>
                        {statusLabels[quote.status] || quote.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {quote.deadline ? formatDate(quote.deadline) : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link href={`/klant/offerte/${quote.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Bekijken
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}