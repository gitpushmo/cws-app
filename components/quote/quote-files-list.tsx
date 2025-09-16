'use client'

import { FileText, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface LineItem {
  id: number
  dxf_file_url: string | null
  dxf_file_name: string
  pdf_file_url: string | null
  pdf_file_name: string | null
  quantity: number
  materials?: {
    name: string
    thickness_mm: number
  } | null
}

interface QuoteFilesListProps {
  lineItems: LineItem[]
}

export default function QuoteFilesList({ lineItems }: QuoteFilesListProps) {
  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!lineItems || lineItems.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Geen bestanden gevonden</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {lineItems.map((item, index) => (
        <div key={item.id} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Line Item {index + 1}</h4>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                Qty: {item.quantity}
              </Badge>
              {item.materials && (
                <Badge variant="secondary">
                  {item.materials.name} ({item.materials.thickness_mm}mm)
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DXF File */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">DXF Bestand</p>
                  <p className="text-xs text-gray-600 truncate max-w-[200px]">
                    {item.dxf_file_name}
                  </p>
                </div>
              </div>
              {item.dxf_file_url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(item.dxf_file_url!, item.dxf_file_name)}
                >
                  <Download className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* PDF File */}
            {item.pdf_file_name && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">PDF Tekening</p>
                    <p className="text-xs text-gray-600 truncate max-w-[200px]">
                      {item.pdf_file_name}
                    </p>
                  </div>
                </div>
                {item.pdf_file_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(item.pdf_file_url!, item.pdf_file_name!)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}