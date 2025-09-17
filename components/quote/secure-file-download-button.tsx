'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'

interface SecureFileDownloadButtonProps {
  fileName: string
  filePath: string
  bucket: string
  quoteId: number
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
}

export default function SecureFileDownloadButton({
  fileName,
  filePath,
  bucket,
  quoteId,
  size = 'sm',
  variant = 'outline'
}: SecureFileDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  // Extract the file path from the full URL if needed
  const extractFilePath = (url: string): string => {
    try {
      // If it's already just a path, return as is
      if (!url.includes('http')) {
        return url
      }

      // Extract path from Supabase storage URL
      // Format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
      const urlParts = url.split('/storage/v1/object/public/')
      if (urlParts.length > 1) {
        const pathWithBucket = urlParts[1]
        // Remove bucket name from start of path
        const pathParts = pathWithBucket.split('/')
        if (pathParts.length > 1) {
          return pathParts.slice(1).join('/')
        }
      }

      // Fallback: use filename if path extraction fails
      return fileName
    } catch (error) {
      console.warn('Error extracting file path:', error)
      return fileName
    }
  }

  const handleSecureDownload = async () => {
    setIsDownloading(true)

    try {
      const actualFilePath = extractFilePath(filePath)

      // Get secure download URL from our API
      const response = await fetch(`/api/files/download?path=${encodeURIComponent(actualFilePath)}&bucket=${encodeURIComponent(bucket)}&quoteId=${quoteId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Download mislukt')
      }

      const { download_url } = await response.json()

      // Trigger secure download
      const a = document.createElement('a')
      a.href = download_url
      a.download = fileName
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

    } catch (error) {
      console.error('Secure download error:', error)
      alert(error instanceof Error ? error.message : 'Download mislukt')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleSecureDownload}
      disabled={isDownloading}
    >
      {isDownloading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {isDownloading ? 'Downloading...' : 'Download'}
    </Button>
  )
}