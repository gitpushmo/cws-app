'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Upload, FileText, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Quote {
  id: number
  status: string
  quote_number: string
  quote_pdf_url?: string
  invoice_pdf_url?: string
}

interface PdfUploadProps {
  quote: Quote
}

type PdfType = 'quote' | 'invoice'

export default function PdfUpload({ quote }: PdfUploadProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pdfType, setPdfType] = useState<PdfType>('quote')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const router = useRouter()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        setUploadError('Alleen PDF bestanden zijn toegestaan')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('Bestand is te groot (max 10MB)')
        return
      }
      setSelectedFile(file)
      setUploadError('')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadError('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('type', pdfType)

      const response = await fetch(`/api/quotes/${quote.id}/upload-pdf`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload mislukt')
      }

      // Success
      alert(`${pdfType === 'quote' ? 'Quote' : 'Invoice'} PDF succesvol geüpload`)
      setIsDialogOpen(false)
      setSelectedFile(null)
      router.refresh()

    } catch (error) {
      console.error('Upload error:', error)
      setUploadError(error instanceof Error ? error.message : 'Upload mislukt')
    } finally {
      setIsUploading(false)
    }
  }

  const canUploadQuote = quote.status === 'ready_for_pricing'
  const canUploadInvoice = quote.status === 'accepted'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>PDF Management</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current PDFs Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Quote PDF:</span>
            {quote.quote_pdf_url ? (
              <Badge variant="default" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Geüpload
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <XCircle className="h-3 w-3 mr-1" />
                Niet geüpload
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Invoice PDF:</span>
            {quote.invoice_pdf_url ? (
              <Badge variant="default" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Geüpload
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <XCircle className="h-3 w-3 mr-1" />
                Niet geüpload
              </Badge>
            )}
          </div>
        </div>

        {/* Upload Actions */}
        <div className="space-y-2">
          {canUploadQuote && (
            <Dialog open={isDialogOpen && pdfType === 'quote'} onOpenChange={(open) => {
              if (open) {
                setPdfType('quote')
              }
              setIsDialogOpen(open)
            }}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setPdfType('quote')}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {quote.quote_pdf_url ? 'Quote PDF Vervangen' : 'Quote PDF Uploaden'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Quote PDF Uploaden</DialogTitle>
                  <DialogDescription>
                    Upload de gegenereerde quote PDF voor offerte {quote.quote_number}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="quote-pdf">Selecteer PDF bestand</Label>
                    <input
                      id="quote-pdf"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="mt-1 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                    />
                  </div>

                  {uploadError && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {uploadError}
                    </div>
                  )}

                  {selectedFile && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <strong>Geselecteerd bestand:</strong> {selectedFile.name}
                      <br />
                      <strong>Grootte:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false)
                        setSelectedFile(null)
                        setUploadError('')
                      }}
                      disabled={isUploading}
                    >
                      Annuleren
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={!selectedFile || isUploading}
                    >
                      {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Uploaden
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {canUploadInvoice && (
            <Dialog open={isDialogOpen && pdfType === 'invoice'} onOpenChange={(open) => {
              if (open) {
                setPdfType('invoice')
              }
              setIsDialogOpen(open)
            }}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setPdfType('invoice')}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {quote.invoice_pdf_url ? 'Invoice PDF Vervangen' : 'Invoice PDF Uploaden'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invoice PDF Uploaden</DialogTitle>
                  <DialogDescription>
                    Upload de factuur PDF voor geaccepteerde offerte {quote.quote_number}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="invoice-pdf">Selecteer PDF bestand</Label>
                    <input
                      id="invoice-pdf"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="mt-1 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-green-50 file:text-green-700
                        hover:file:bg-green-100"
                    />
                  </div>

                  {uploadError && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {uploadError}
                    </div>
                  )}

                  {selectedFile && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <strong>Geselecteerd bestand:</strong> {selectedFile.name}
                      <br />
                      <strong>Grootte:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false)
                        setSelectedFile(null)
                        setUploadError('')
                      }}
                      disabled={isUploading}
                    >
                      Annuleren
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={!selectedFile || isUploading}
                    >
                      {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Uploaden
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {!canUploadQuote && !canUploadInvoice && (
            <p className="text-sm text-gray-500 text-center py-2">
              PDF upload niet beschikbaar voor status: {quote.status}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}