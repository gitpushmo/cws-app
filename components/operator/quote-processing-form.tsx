'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'

interface Material {
  id: number
  name: string
  thickness_mm: number
  price_per_sqm: number
  cutting_speed_factor: number
}

interface LineItem {
  id: number
  dxf_file_name: string
  quantity: number
  material_id: number | null
  cutting_price: number | null
  production_time_hours: number | null
  materials?: Material | null
}

interface Quote {
  id: number
  quote_number: string
  status: string
  line_items?: LineItem[]
  total_cutting_price?: number | null
  production_time_hours?: number | null
}

interface QuoteProcessingFormProps {
  quote: Quote
  materials: Material[]
  userRole: string
}

export default function QuoteProcessingForm({ quote, materials, userRole }: QuoteProcessingFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lineItemData, setLineItemData] = useState<{[key: number]: {materialId: string, cuttingPrice: string, productionTime: string}}>({})
  const [needsAttentionComment, setNeedsAttentionComment] = useState('')
  const [internalComment, setInternalComment] = useState('')

  // Initialize line item data
  const initializeLineItem = (lineItemId: number) => {
    if (!lineItemData[lineItemId]) {
      const lineItem = quote.line_items?.find(li => li.id === lineItemId)
      setLineItemData(prev => ({
        ...prev,
        [lineItemId]: {
          materialId: lineItem?.material_id?.toString() || '',
          cuttingPrice: lineItem?.cutting_price?.toString() || '',
          productionTime: lineItem?.production_time_hours?.toString() || ''
        }
      }))
    }
  }

  const updateLineItemData = (lineItemId: number, field: string, value: string) => {
    initializeLineItem(lineItemId)
    setLineItemData(prev => ({
      ...prev,
      [lineItemId]: {
        ...prev[lineItemId],
        [field]: value
      }
    }))
  }

  const handleMarkNeedsAttention = async () => {
    if (!needsAttentionComment.trim()) {
      setError('Voeg een opmerking toe waarom deze offerte aandacht vereist')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Update quote status
      const statusResponse = await fetch(`/api/quotes/${quote.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'needs_attention' })
      })

      if (!statusResponse.ok) {
        throw new Error('Failed to update quote status')
      }

      // Add public comment
      const commentResponse = await fetch(`/api/quotes/${quote.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: needsAttentionComment,
          visibility: 'public'
        })
      })

      if (!commentResponse.ok) {
        throw new Error('Failed to add comment')
      }

      router.push('/operator')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkReadyForPricing = async () => {
    setLoading(true)
    setError('')

    try {
      // Validate all line items have required data
      const lineItems = quote.line_items || []
      const updates = []

      for (const lineItem of lineItems) {
        const data = lineItemData[lineItem.id]
        if (!data?.materialId || !data?.cuttingPrice || !data?.productionTime) {
          throw new Error(`Alle line items moeten materiaal, prijs en productietijd hebben ingevuld`)
        }

        updates.push({
          lineItemId: lineItem.id,
          materialId: parseInt(data.materialId),
          cuttingPrice: parseFloat(data.cuttingPrice),
          productionTime: parseFloat(data.productionTime)
        })
      }

      // Update line items
      for (const update of updates) {
        const response = await fetch(`/api/line-items/${update.lineItemId}/material`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            material_id: update.materialId,
            cutting_price: update.cuttingPrice,
            production_time_hours: update.productionTime
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to update line item ${update.lineItemId}`)
        }
      }

      // Calculate totals
      const totalCuttingPrice = updates.reduce((sum, item) => sum + item.cuttingPrice, 0)
      const totalProductionTime = updates.reduce((sum, item) => sum + item.productionTime, 0)

      // Update quote status and totals
      const statusResponse = await fetch(`/api/quotes/${quote.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'ready_for_pricing',
          total_cutting_price: totalCuttingPrice,
          production_time_hours: totalProductionTime
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

      router.push('/operator')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  const canProcess = quote.status === 'pending' || quote.status === 'needs_attention'

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {quote.status === 'pending' && <Clock className="h-5 w-5 text-blue-600" />}
            {quote.status === 'needs_attention' && <AlertCircle className="h-5 w-5 text-orange-600" />}
            {quote.status === 'ready_for_pricing' && <CheckCircle className="h-5 w-5 text-green-600" />}
            <span>Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant={quote.status === 'pending' ? 'secondary' :
                         quote.status === 'needs_attention' ? 'destructive' : 'default'}>
            {quote.status === 'pending' && 'Wacht op Beoordeling'}
            {quote.status === 'needs_attention' && 'Aandacht Vereist'}
            {quote.status === 'ready_for_pricing' && 'Klaar voor Pricing'}
          </Badge>
        </CardContent>
      </Card>

      {/* Line Items Processing */}
      {canProcess && (
        <Card>
          <CardHeader>
            <CardTitle>Line Items Bewerken</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {quote.line_items?.map((lineItem, index) => (
              <div key={lineItem.id} className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">
                  {index + 1}. {lineItem.dxf_file_name} (Qty: {lineItem.quantity})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Material Selection */}
                  <div className="space-y-2">
                    <Label>Materiaal</Label>
                    <Select
                      value={lineItemData[lineItem.id]?.materialId || ''}
                      onValueChange={(value) => updateLineItemData(lineItem.id, 'materialId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer materiaal" />
                      </SelectTrigger>
                      <SelectContent>
                        {materials.map((material) => (
                          <SelectItem key={material.id} value={material.id.toString()}>
                            {material.name} ({material.thickness_mm}mm)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Cutting Price */}
                  <div className="space-y-2">
                    <Label>Snij Prijs (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={lineItemData[lineItem.id]?.cuttingPrice || ''}
                      onChange={(e) => updateLineItemData(lineItem.id, 'cuttingPrice', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Production Time */}
                  <div className="space-y-2">
                    <Label>Productie Tijd (uur)</Label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      value={lineItemData[lineItem.id]?.productionTime || ''}
                      onChange={(e) => updateLineItemData(lineItem.id, 'productionTime', e.target.value)}
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Internal Comment */}
            <div className="space-y-2">
              <Label>Interne Opmerking (optioneel)</Label>
              <Textarea
                value={internalComment}
                onChange={(e) => setInternalComment(e.target.value)}
                placeholder="Notities voor admin team..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {canProcess && (
        <Card>
          <CardHeader>
            <CardTitle>Acties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Mark as Needs Attention */}
            <div className="space-y-3">
              <Label>Markeer als "Aandacht Vereist"</Label>
              <Textarea
                value={needsAttentionComment}
                onChange={(e) => setNeedsAttentionComment(e.target.value)}
                placeholder="Leg uit wat er mis is met deze offerte..."
                rows={3}
              />
              <Button
                variant="destructive"
                onClick={handleMarkNeedsAttention}
                disabled={loading || !needsAttentionComment.trim()}
                className="w-full"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Aandacht Vereist
              </Button>
            </div>

            <div className="border-t pt-4">
              <Button
                onClick={handleMarkReadyForPricing}
                disabled={loading}
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Klaar voor Pricing
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Read-only summary for completed processing */}
      {!canProcess && quote.status === 'ready_for_pricing' && (
        <Card>
          <CardHeader>
            <CardTitle>Verwerking Voltooid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Totale Snij Prijs:</span> €{quote.total_cutting_price?.toFixed(2) || '0.00'}
              </div>
              <div>
                <span className="font-medium">Totale Productie Tijd:</span> {quote.production_time_hours?.toFixed(2) || '0.0'} uur
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}