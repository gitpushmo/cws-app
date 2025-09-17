'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { CheckCircle, XCircle, MessageSquare, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import PaymentRequired from '@/components/payment/payment-required'

interface Quote {
  id: number
  status: string
  quote_number: string
  total_customer_price?: number
}

interface CustomerQuoteActionsProps {
  quote: Quote
}

export default function CustomerQuoteActions({ quote }: CustomerQuoteActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [revisionMessage, setRevisionMessage] = useState('')
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const router = useRouter()

  // Show payment interface if payment is required
  if (showPayment) {
    return (
      <PaymentRequired
        amount={paymentAmount}
        quoteNumber={quote.quote_number}
        onPaymentCompleted={() => {
          setShowPayment(false)
          router.refresh()
        }}
      />
    )
  }

  // Only show actions for 'sent' quotes
  if (quote.status !== 'sent') {
    return null
  }

  const handleResponse = async (action: 'accept' | 'decline' | 'request_revision') => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/quotes/${quote.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          message: action === 'request_revision' ? revisionMessage : undefined
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Er is een fout opgetreden')
      }

      // Handle successful responses
      if (action === 'accept') {
        if (data.payment_required) {
          setPaymentAmount(data.payment_amount || quote.total_customer_price || 0)
          setShowPayment(true)
        } else {
          alert('Offerte geaccepteerd!')
          router.refresh()
        }
      } else if (action === 'decline') {
        alert('Offerte afgewezen')
        router.refresh()
      } else if (action === 'request_revision') {
        alert('Revisie verzoek verstuurd naar admin')
        setIsRevisionDialogOpen(false)
        setRevisionMessage('')
        router.refresh()
      }

    } catch (error) {
      console.error('Error responding to quote:', error)
      alert(error instanceof Error ? error.message : 'Er is een fout opgetreden')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '€0.00'
    return `€${amount.toFixed(2)}`
  }

  return (
    <div className="space-y-4">
      {/* Quote Total */}
      {quote.total_customer_price && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-gray-600">Totaal bedrag</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(quote.total_customer_price)}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900">Actie vereist</h3>
        <p className="text-sm text-gray-600">
          Kies een actie voor deze offerte:
        </p>

        {/* Accept Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="w-full"
              disabled={isLoading}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Accepteren
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Offerte Accepteren</AlertDialogTitle>
              <AlertDialogDescription>
                Weet u zeker dat u deze offerte wilt accepteren voor {formatCurrency(quote.total_customer_price)}?
                U wordt doorgestuurd naar de betalingspagina om de betaling af te ronden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Annuleren</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleResponse('accept')}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Ja, Accepteren
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Decline Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Afwijzen
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Offerte Afwijzen</AlertDialogTitle>
              <AlertDialogDescription>
                Weet u zeker dat u deze offerte wilt afwijzen? Deze actie kan niet ongedaan worden gemaakt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Annuleren</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleResponse('decline')}
                disabled={isLoading}
                variant="destructive"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Ja, Afwijzen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Request Revision Button */}
        <Dialog open={isRevisionDialogOpen} onOpenChange={setIsRevisionDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              className="w-full"
              disabled={isLoading}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Revisie Aanvragen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revisie Aanvragen</DialogTitle>
              <DialogDescription>
                Heeft u wijzigingen of vragen over deze offerte? Beschrijf wat u graag aangepast wilt zien.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="revision-message">Uw bericht *</Label>
                <Textarea
                  id="revision-message"
                  placeholder="Beschrijf de gewenste wijzigingen of stel uw vragen..."
                  value={revisionMessage}
                  onChange={(e) => setRevisionMessage(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRevisionDialogOpen(false)
                    setRevisionMessage('')
                  }}
                  disabled={isLoading}
                >
                  Annuleren
                </Button>
                <Button
                  onClick={() => handleResponse('request_revision')}
                  disabled={isLoading || !revisionMessage.trim()}
                >
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Versturen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}