'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import FileUploadZone from './file-upload-zone'
import { CreateQuoteRequest } from '@/lib/types'

// Form validation schema
const quoteFormSchema = z.object({
  shipping_address: z.object({
    street: z.string().min(1, 'Straatnaam is verplicht'),
    city: z.string().min(1, 'Plaats is verplicht'),
    postal_code: z.string().min(1, 'Postcode is verplicht'),
    country: z.string().min(1, 'Land is verplicht').default('Nederland')
  }),
  notes: z.string().optional(),
  deadline: z.string().optional()
})

type QuoteFormData = z.infer<typeof quoteFormSchema>

interface UploadedFile {
  file: File
  id: string
  uploading?: boolean
  uploaded?: boolean
  error?: string
  quantity?: number
}

export default function QuoteCreator() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string>('')
  const router = useRouter()

  const form = useForm({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      shipping_address: {
        street: '',
        city: '',
        postal_code: '',
        country: 'Nederland'
      },
      notes: '',
      deadline: ''
    }
  })

  // Validate files before submission
  const validateFiles = (): string | null => {
    const validFiles = files.filter(f => !f.error)
    const dxfFiles = validFiles.filter(f => f.file.name.toLowerCase().endsWith('.dxf'))

    if (validFiles.length === 0) {
      return 'Minimaal één bestand is verplicht'
    }

    if (dxfFiles.length === 0) {
      return 'Minimaal één DXF bestand is verplicht'
    }

    return null
  }

  const uploadFiles = async (quoteId: number): Promise<boolean> => {
    const validFiles = files.filter(f => !f.error)
    let allUploadsSuccessful = true

    for (const uploadedFile of validFiles) {
      try {
        // Update file status to uploading
        setFiles(prev => prev.map(f =>
          f.id === uploadedFile.id ? { ...f, uploading: true } : f
        ))

        const formData = new FormData()
        formData.append('file', uploadedFile.file)
        formData.append('quoteId', quoteId.toString())

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Upload mislukt')
        }

        // Mark file as uploaded
        setFiles(prev => prev.map(f =>
          f.id === uploadedFile.id
            ? { ...f, uploading: false, uploaded: true }
            : f
        ))

      } catch (error) {
        console.error('File upload error:', error)
        allUploadsSuccessful = false

        // Mark file with error
        setFiles(prev => prev.map(f =>
          f.id === uploadedFile.id
            ? {
                ...f,
                uploading: false,
                error: error instanceof Error ? error.message : 'Upload mislukt'
              }
            : f
        ))
      }
    }

    return allUploadsSuccessful
  }

  const onSubmit = async (data: QuoteFormData) => {
    setSubmitError('')
    setIsSubmitting(true)

    try {
      // Validate files first
      const fileError = validateFiles()
      if (fileError) {
        setSubmitError(fileError)
        return
      }

      // Create quote request
      const quoteRequest: CreateQuoteRequest = {
        shipping_address: data.shipping_address,
        notes: data.notes || undefined,
        deadline: data.deadline || undefined
      }

      // Create quote
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(quoteRequest)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fout bij aanmaken offerte')
      }

      const quote = await response.json()
      console.log('Quote created:', quote)

      // Upload files
      const uploadSuccess = await uploadFiles(quote.id)

      if (uploadSuccess) {
        // Redirect to quote detail or success page
        router.push(`/klant/quotes/${quote.id}`)
      } else {
        setSubmitError('Offerte aangemaakt, maar niet alle bestanden zijn geüpload. U kunt deze later toevoegen.')
        // Still redirect after a delay
        setTimeout(() => {
          router.push(`/klant/quotes/${quote.id}`)
        }, 3000)
      }

    } catch (error) {
      console.error('Submit error:', error)
      setSubmitError(error instanceof Error ? error.message : 'Er is een fout opgetreden')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nieuwe Offerte Aanvragen</CardTitle>
          <CardDescription>
            Vul de gegevens in en upload uw bestanden om een offerte aan te vragen voor waterjet snijden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* File Upload Section */}
            <FileUploadZone
              files={files}
              onFilesChange={setFiles}
              disabled={isSubmitting}
            />

            {/* Shipping Address Section */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Verzendadres *</Label>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="street">Straatnaam en huisnummer *</Label>
                  <Input
                    id="street"
                    {...form.register('shipping_address.street')}
                    disabled={isSubmitting}
                    placeholder="Bijv. Hoofdstraat 123"
                  />
                  {form.formState.errors.shipping_address?.street && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.shipping_address.street.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postal_code">Postcode *</Label>
                    <Input
                      id="postal_code"
                      {...form.register('shipping_address.postal_code')}
                      disabled={isSubmitting}
                      placeholder="1234 AB"
                    />
                    {form.formState.errors.shipping_address?.postal_code && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.shipping_address.postal_code.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="city">Plaats *</Label>
                    <Input
                      id="city"
                      {...form.register('shipping_address.city')}
                      disabled={isSubmitting}
                      placeholder="Amsterdam"
                    />
                    {form.formState.errors.shipping_address?.city && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.shipping_address.city.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="country">Land *</Label>
                  <Input
                    id="country"
                    {...form.register('shipping_address.country')}
                    disabled={isSubmitting}
                  />
                  {form.formState.errors.shipping_address?.country && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.shipping_address.country.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Optional Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="deadline">Gewenste opleverdatum (optioneel)</Label>
                <Input
                  id="deadline"
                  type="date"
                  {...form.register('deadline')}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="notes">Opmerkingen (optioneel)</Label>
                <Textarea
                  id="notes"
                  {...form.register('notes')}
                  disabled={isSubmitting}
                  placeholder="Aanvullende informatie of speciale wensen..."
                  rows={3}
                />
              </div>
            </div>

            {/* Error Display */}
            {submitError && (
              <Alert>
                <AlertDescription>
                  {submitError}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Bezig met verzenden...' : 'Offerte Aanvragen'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/klant')}
                disabled={isSubmitting}
              >
                Annuleren
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}