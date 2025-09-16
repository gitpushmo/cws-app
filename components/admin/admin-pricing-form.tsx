'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, CheckCircle, Euro, Percent } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'

interface Material {
  id: number
  name: string
  thickness_mm: number
  price_per_sqm: number
}

interface LineItem {
  id: number
  dxf_file_name: string
  quantity: number
  cutting_price: number | null
  customer_price: number | null
  production_time_hours: number | null
  materials?: Material | null
}

interface Quote {
  id: number
  quote_number: string
  status: string
  line_items?: LineItem[]
  total_cutting_price?: number | null
  total_customer_price?: number | null
  production_time_hours?: number | null
}

interface AdminPricingFormProps {
  quote: Quote
  userRole: string
}

export default function AdminPricingForm({ quote, userRole }: AdminPricingFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lineItemPrices, setLineItemPrices] = useState<{[key: number]: string}>({})
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState('')
  const [internalComment, setInternalComment] = useState('')
  const [totals, setTotals] = useState({
    totalCutting: 0,
    totalSuggested: 0,
    totalCustomer: 0,
    totalMaterial: 0
  })

  // Initialize prices and calculate totals
  useEffect(() => {
    const lineItems = quote.line_items || []
    const initialPrices: {[key: number]: string} = {}

    let totalCutting = 0
    let totalMaterial = 0
    let totalSuggested = 0
    let totalCustomer = 0

    lineItems.forEach(item => {
      const cuttingPrice = item.cutting_price || 0
      const materialPrice = item.materials?.price_per_sqm || 0

      // Suggested price: Material cost + (Cutting price × 2)
      const suggestedPrice = materialPrice + (cuttingPrice * 2)

      // Use existing customer price or suggested price
      const customerPrice = item.customer_price || suggestedPrice

      initialPrices[item.id] = customerPrice.toFixed(2)

      totalCutting += cuttingPrice
      totalMaterial += materialPrice
      totalSuggested += suggestedPrice
      totalCustomer += customerPrice
    })

    setLineItemPrices(initialPrices)
    setTotals({
      totalCutting,
      totalMaterial,
      totalSuggested,
      totalCustomer
    })
  }, [quote])

  // Recalculate totals when prices change
  useEffect(() => {
    const lineItems = quote.line_items || []
    let totalCustomer = 0

    lineItems.forEach(item => {
      const price = parseFloat(lineItemPrices[item.id] || '0')
      if (!isNaN(price)) {
        totalCustomer += price
      }
    })

    setTotals(prev => ({ ...prev, totalCustomer }))
  }, [lineItemPrices, quote.line_items])

  const updateLineItemPrice = (lineItemId: number, price: string) => {
    setLineItemPrices(prev => ({
      ...prev,
      [lineItemId]: price
    }))
  }

  const applyBulkDiscount = () => {
    const discount = parseFloat(bulkDiscountPercent)
    if (isNaN(discount) || discount <= 0 || discount >= 100) {
      setError('Korting moet tussen 0 en 100% zijn')
      return
    }

    const multiplier = (100 - discount) / 100
    const newPrices: {[key: number]: string} = {}

    Object.entries(lineItemPrices).forEach(([lineItemId, currentPrice]) => {
      const price = parseFloat(currentPrice)
      if (!isNaN(price)) {
        newPrices[parseInt(lineItemId)] = (price * multiplier).toFixed(2)
      }
    })

    setLineItemPrices(newPrices)
    setBulkDiscountPercent('')
    setError('')
  }

  const resetToSuggested = () => {
    const lineItems = quote.line_items || []
    const resetPrices: {[key: number]: string} = {}

    lineItems.forEach(item => {
      const cuttingPrice = item.cutting_price || 0
      const materialPrice = item.materials?.price_per_sqm || 0
      const suggestedPrice = materialPrice + (cuttingPrice * 2)
      resetPrices[item.id] = suggestedPrice.toFixed(2)
    })

    setLineItemPrices(resetPrices)
  }

  const handleSendQuote = async () => {
    setLoading(true)
    setError('')

    try {
      // Validate all prices are set
      const lineItems = quote.line_items || []
      const updates = []

      for (const lineItem of lineItems) {
        const priceStr = lineItemPrices[lineItem.id]
        if (!priceStr || priceStr.trim() === '') {
          throw new Error(`Alle line items moeten een klantprijs hebben`)
        }

        const price = parseFloat(priceStr)
        if (isNaN(price) || price <= 0) {
          throw new Error(`Ongeldige prijs voor ${lineItem.dxf_file_name}`)
        }

        updates.push({
          lineItemId: lineItem.id,
          customerPrice: price
        })
      }

      // Update line item customer prices
      for (const update of updates) {
        const response = await fetch(`/api/line-items/${update.lineItemId}/customer-price`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_price: update.customerPrice
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to update line item ${update.lineItemId}`)
        }
      }

      const totalCustomerPrice = updates.reduce((sum, item) => sum + item.customerPrice, 0)

      // Update quote status and totals
      const statusResponse = await fetch(`/api/quotes/${quote.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'sent',
          total_customer_price: totalCustomerPrice,
          sent_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days
        })
      })

      if (!statusResponse.ok) {
        throw new Error('Failed to update quote status')
      }

      // Add internal comment if provided
      if (internalComment.trim()) {
        await fetch(`/api/quotes/${quote.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: internalComment,
            visibility: 'internal'
          })
        })
      }

      // TODO: Send email to customer with quote
      // TODO: Generate and upload quote PDF

      router.push('/admin/pricing-queue')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `€${amount.toFixed(2)}`
  }

  const getMarginPercentage = (customerPrice: number, cuttingPrice: number, materialPrice: number) => {
    const cost = cuttingPrice + materialPrice
    if (cost === 0) return 0
    return ((customerPrice - cost) / customerPrice * 100)
  }

  return (
    <div className="space-y-6">
      {/* Pricing Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Euro className="h-5 w-5 text-green-600" />
            <span>Pricing Overzicht</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Snij Kosten:</span>
              <div className="font-medium">{formatCurrency(totals.totalCutting)}</div>
            </div>
            <div>
              <span className="text-gray-600">Materiaal Kosten:</span>
              <div className="font-medium">{formatCurrency(totals.totalMaterial)}</div>
            </div>
            <div>
              <span className="text-gray-600">Voorgestelde Prijs:</span>
              <div className="font-medium text-blue-600">{formatCurrency(totals.totalSuggested)}</div>
            </div>
            <div>
              <span className="text-gray-600">Klant Prijs:</span>
              <div className="font-bold text-green-600">{formatCurrency(totals.totalCustomer)}</div>
            </div>
          </div>

          <Separator />

          <div className="text-center">
            <div className="text-sm text-gray-600">Totale Marge</div>
            <div className="text-xl font-bold text-purple-600">
              {getMarginPercentage(totals.totalCustomer, totals.totalCutting, totals.totalMaterial).toFixed(1)}%
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Discount */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Percent className="h-5 w-5 text-orange-600" />
            <span>Bulk Korting</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                type="number"
                min="0"
                max="99"
                step="0.1"
                value={bulkDiscountPercent}
                onChange={(e) => setBulkDiscountPercent(e.target.value)}
                placeholder="Korting %"
              />
            </div>
            <Button onClick={applyBulkDiscount} variant="outline">
              Toepassen
            </Button>
          </div>

          <Button onClick={resetToSuggested} variant="outline" className="w-full" size="sm">
            Reset naar Voorgestelde Prijzen
          </Button>
        </CardContent>
      </Card>

      {/* Line Item Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Klant Prijzen per Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {quote.line_items?.map((item, index) => {
            const cuttingPrice = item.cutting_price || 0
            const materialPrice = item.materials?.price_per_sqm || 0
            const customerPrice = parseFloat(lineItemPrices[item.id] || '0')
            const margin = getMarginPercentage(customerPrice, cuttingPrice, materialPrice)

            return (
              <div key={item.id} className="border rounded p-3 space-y-3">
                <div className="flex justify-between items-start">
                  <h5 className="font-medium">
                    {index + 1}. {item.dxf_file_name}
                  </h5>
                  <Badge variant="outline">
                    Qty: {item.quantity}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                  <div>Snij: {formatCurrency(cuttingPrice)}</div>
                  <div>Materiaal: {formatCurrency(materialPrice)}</div>
                  <div>Marge: <span className={margin > 50 ? 'text-green-600' : margin > 25 ? 'text-orange-600' : 'text-red-600'}>{margin.toFixed(1)}%</span></div>
                </div>

                <div className="flex items-center space-x-2">
                  <Label className="text-sm">Klant Prijs:</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={lineItemPrices[item.id] || ''}
                    onChange={(e) => updateLineItemPrice(item.id, e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Internal Comment */}
      <Card>
        <CardHeader>
          <CardTitle>Interne Opmerking</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={internalComment}
            onChange={(e) => setInternalComment(e.target.value)}
            placeholder="Notities over pricing, marges, speciale overwegingen..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Offerte Verzenden</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Klaar om te Verzenden</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              De offerte wordt naar de klant gestuurd met een geldigheid van 14 dagen.
            </p>
            <div className="text-sm">
              <strong>Totaal: {formatCurrency(totals.totalCustomer)}</strong>
            </div>
          </div>

          <Button
            onClick={handleSendQuote}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Offerte Verzenden naar Klant
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}