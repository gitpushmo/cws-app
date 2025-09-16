// Minimal types for Phase 1 backend - keep it simple
export interface ShippingAddress {
  street: string
  city: string
  postal_code: string
  country: string
}

export interface CreateQuoteRequest {
  notes?: string
  deadline?: string
  shipping_address: ShippingAddress
}

export interface UploadedFile {
  file_url: string
  file_name: string
}

export interface QuoteResponse {
  id: number
  quote_number: string
  status: string
  notes?: string
  deadline?: string
  shipping_address: ShippingAddress
  created_at: string
  updated_at: string
}

export interface ApiError {
  error: string
  details?: string
}

export interface FileUploadResponse {
  file_url: string
  file_name: string
}