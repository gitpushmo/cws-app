'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { X, Upload, File } from 'lucide-react'

interface UploadedFile {
  file: File
  id: string
  uploading?: boolean
  uploaded?: boolean
  error?: string
  quantity?: number
}

interface FileUploadZoneProps {
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
  disabled?: boolean
}

export default function FileUploadZone({ files, onFilesChange, disabled }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['.dxf', '.pdf']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

    if (file.size > maxSize) {
      return 'Bestand te groot (max 10MB)'
    }

    if (!allowedTypes.includes(fileExtension)) {
      return 'Alleen DXF en PDF bestanden toegestaan'
    }

    return null
  }

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadedFile[] = []

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      const error = validateFile(file)

      // Check if file already exists
      const existingFile = files.find(f => f.file.name === file.name && f.file.size === file.size)
      if (existingFile) continue

      newFiles.push({
        file,
        id: `${file.name}-${Date.now()}-${i}`,
        error: error || undefined,
        quantity: file.name.toLowerCase().endsWith('.dxf') ? 1 : undefined
      })
    }

    onFilesChange([...files, ...newFiles])
  }, [files, onFilesChange])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
      e.target.value = '' // Reset input
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)

    if (disabled || !e.dataTransfer.files) return
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!disabled) setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const removeFile = (id: string) => {
    onFilesChange(files.filter(f => f.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    onFilesChange(files.map(f =>
      f.id === id ? { ...f, quantity } : f
    ))
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Bestanden uploaden *</Label>
        <p className="text-sm text-gray-600 mt-1">
          Upload uw DXF bestanden en technische tekeningen (PDF). DXF bestanden zijn verplicht.
        </p>
      </div>

      {/* Upload Zone */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : disabled
              ? 'border-gray-200 bg-gray-50'
              : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-8 text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              Sleep bestanden hierheen of klik om te selecteren
            </p>
            <p className="text-sm text-gray-600">
              DXF en PDF bestanden tot 10MB per bestand
            </p>
          </div>
          <div className="mt-4">
            <Input
              type="file"
              multiple
              accept=".dxf,.pdf"
              onChange={handleFileInput}
              disabled={disabled}
              className="hidden"
              id="file-upload"
            />
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Bestanden selecteren
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <Label>Geüploade bestanden</Label>
          <div className="space-y-2">
            {files.map((uploadedFile) => (
              <Card key={uploadedFile.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <File className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {uploadedFile.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>

                      {uploadedFile.error && (
                        <Alert className="mt-2">
                          <AlertDescription className="text-xs">
                            {uploadedFile.error}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Quantity input for DXF files */}
                      {uploadedFile.file.name.toLowerCase().endsWith('.dxf') && !uploadedFile.error && (
                        <div className="mt-2 flex items-center space-x-2">
                          <Label htmlFor={`quantity-${uploadedFile.id}`} className="text-xs">
                            Aantal:
                          </Label>
                          <Input
                            id={`quantity-${uploadedFile.id}`}
                            type="number"
                            min="1"
                            value={uploadedFile.quantity || 1}
                            onChange={(e) => updateQuantity(uploadedFile.id, parseInt(e.target.value) || 1)}
                            className="w-20 h-7 text-xs"
                            disabled={disabled}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(uploadedFile.id)}
                    disabled={disabled}
                    className="ml-2 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Validation Summary */}
      {files.length > 0 && (
        <div className="text-xs text-gray-600">
          <p>DXF bestanden: {files.filter(f => f.file.name.toLowerCase().endsWith('.dxf') && !f.error).length}</p>
          <p>PDF bestanden: {files.filter(f => f.file.name.toLowerCase().endsWith('.pdf') && !f.error).length}</p>
          {files.some(f => f.error) && (
            <p className="text-red-600 mt-1">
              Sommige bestanden hebben fouten en worden niet geüpload
            </p>
          )}
        </div>
      )}
    </div>
  )
}