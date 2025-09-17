'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, ExternalLink, CheckCircle } from 'lucide-react'

interface PaymentRequiredProps {
  amount: number
  quoteNumber: string
  onPaymentCompleted?: () => void
}

export default function PaymentRequired({
  amount,
  quoteNumber,
  onPaymentCompleted
}: PaymentRequiredProps) {
  const formatCurrency = (amount: number) => {
    return `€${amount.toFixed(2)}`
  }

  const handlePaymentRedirect = () => {
    // TODO: Integrate with actual payment processor (Stripe, Mollie, etc.)
    // For now, show a placeholder message
    alert(`Redirecting to payment processor for ${formatCurrency(amount)}\n\nThis would normally redirect to Stripe, Mollie, or your chosen payment provider.`)

    // Simulate payment completion for demo
    if (onPaymentCompleted) {
      setTimeout(() => {
        onPaymentCompleted()
      }, 2000)
    }
  }

  const handleBankTransfer = () => {
    // Show bank transfer details
    alert(`Bank transfer details:\n\nAmount: ${formatCurrency(amount)}\nReference: ${quoteNumber}\n\nIBAN: NL91 ABNA 0417 1643 00\nBIC: ABNANL2A\nBeneficiary: Your Company Name\n\nPlease include the quote number (${quoteNumber}) as reference.`)
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-green-800 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Offerte Geaccepteerd
          </CardTitle>
          <Badge variant="default" className="bg-green-600">
            Betaling Vereist
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center p-4 bg-white rounded-lg border">
          <p className="text-sm text-gray-600 mb-2">Te betalen bedrag</p>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(amount)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Voor offerte: {quoteNumber}
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Kies uw betaalmethode:</h4>

          {/* Online Payment */}
          <Button
            onClick={handlePaymentRedirect}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Online Betalen (iDEAL, Creditcard)
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>

          {/* Bank Transfer */}
          <Button
            onClick={handleBankTransfer}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Bank Overschrijving
          </Button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
          <p className="text-blue-800">
            <strong>Belangrijk:</strong> Na succesvolle betaling ontvangt u een bevestiging
            en wordt uw bestelling in productie genomen. Bij vragen over de betaling kunt u
            contact opnemen via de chat functie hieronder.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}