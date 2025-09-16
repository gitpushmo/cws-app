'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface FileDownloadButtonProps {
  fileUrl: string
  fileName: string
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
}

export default function FileDownloadButton({
  fileUrl,
  fileName,
  size = 'sm',
  variant = 'outline'
}: FileDownloadButtonProps) {
  const handleDownload = async () => {
    try {
      // Simple browser download
      const a = document.createElement('a')
      a.href = fileUrl
      a.download = fileName
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleDownload}
    >
      <Download className="h-4 w-4 mr-2" />
      Download
    </Button>
  )
}