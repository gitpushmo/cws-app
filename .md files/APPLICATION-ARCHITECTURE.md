# APPLICATION ARCHITECTURE - CWS Waterjet Cutting Platform

## 🎯 Purpose
Minimal, practical architecture for a B2B waterjet cutting quote-to-production platform.
**No over-engineering. Build what's needed. Keep it simple.**

## 📋 System Overview

### Business Flow
1. **Customer** uploads DXF/PDF files → Creates quote request
2. **Operator** reviews files → Sets cutting price or requests changes
3. **Admin** sets customer price → Sends quote to customer
4. **Customer** accepts quote → Pays → Order created
5. **Operator** produces parts → Ships to customer

### User Roles
- **Customer** (`klant`): Businesses requesting cutting services
- **Operator** (`operator`): Partner engineers who cut panels
- **Admin** (`admin`): Internal team managing pricing and orders

## 🛠 Tech Stack (Already Configured)
```
Frontend:  Next.js 15.5.3 + TypeScript + Shadcn UI
Backend:   Next.js API Routes + Supabase Functions
Database:  Supabase (PostgreSQL with RLS)
Auth:      Supabase Auth (implemented ✅)
Storage:   Supabase Storage
Payments:  Mollie (webhooks)
Email:     Resend (via queue)
```

## 📁 Codebase Structure

```
cws-app/
├── app/                        # Next.js App Router
│   ├── (public)/              # Public routes
│   │   ├── page.tsx           # Landing page
│   │   └── auth/              # Login/Register (✅ implemented)
│   ├── klant/                 # Customer dashboard
│   │   ├── page.tsx           # Quote list
│   │   ├── offerte/
│   │   │   ├── nieuw/         # Create quote
│   │   │   └── [id]/          # View/edit quote
│   │   └── orders/           # Orders
│   ├── operator/              # Operator dashboard
│   │   ├── page.tsx           # Pending quotes
│   │   ├── offerte/[id]/      # Process quote
│   │   └── productie/         # Production queue
│   ├── admin/                 # Admin dashboard
│   │   ├── page.tsx           # Overview
│   │   ├── quotes/           # All quotes
│   │   ├── pricing/          # Pricing management
│   │   └── materials/        # Materials CRUD
│   └── api/
│       ├── quotes/            # Quote endpoints
│       ├── files/             # File handling
│       └── webhooks/          # Mollie webhooks
├── components/
│   ├── quotes/
│   │   ├── customer/          # Customer-specific components
│   │   ├── operator/          # Operator-specific components
│   │   └── admin/             # Admin-specific components
│   ├── files/
│   │   ├── upload-zone.tsx   # DXF/PDF upload
│   │   └── file-list.tsx     # Display uploaded files
│   ├── ui/                    # Shadcn components
│   └── shared/                # Shared components
├── lib/
│   ├── supabase/              # Supabase client (✅ configured)
│   ├── validation/            # Zod schemas
│   ├── business-logic/        # Core business rules
│   ├── errors/                # Error handling
│   └── utils/                 # Helpers
└── middleware.ts              # Auth & routing (✅ implemented)
```

## 🔄 Data Flow

### Quote Creation (Customer)
```
1. Customer uploads files → Supabase Storage
2. Creates quote with metadata → Database
3. Line items auto-created from files
4. Quote status: 'pending'
5. Email notification → Operators
```

### Quote Processing (Operator)
```
1. Operator claims quote (assigns self)
2. Reviews files → Downloads DXF/PDF
3. Either:
   a. Marks 'needs_attention' + comment → Customer notified
   b. Sets prices + 'ready_for_pricing' → Admin notified
```

### Quote Pricing (Admin)
```
1. Reviews operator pricing
2. Sets customer prices
3. Generates quote PDF
4. Sends to customer → status: 'sent'
5. 14-day expiry timer starts
```

## 🏗 Components Architecture

### Role-Specific Components (Not Generic!)
```typescript
// ❌ DON'T: Generic components with role props
<QuoteList role={userRole} />

// ✅ DO: Separate components per role
<CustomerQuoteList />
<OperatorQuoteList />
<AdminQuoteList />
```

### Core Components

#### Customer Components
- `QuoteCreator` - Multi-step form for new quotes
- `CustomerQuoteList` - Shows own quotes with status
- `QuoteDetails` - View quote with comments
- `PaymentButton` - Mollie payment initiation

#### Operator Components
- `OperatorQueueList` - Pending quotes to claim
- `QuoteProcessor` - Review files, set prices
- `ProductionList` - Accepted quotes in production

#### Admin Components
- `AdminQuoteList` - All quotes with filters
- `PricingPanel` - Set customer prices
- `MaterialsManager` - CRUD for materials
- `QuotePDFGenerator` - Generate formal quotes

#### Shared Components
- `FileUploadZone` - Drag & drop DXF/PDF
- `CommentThread` - Public/internal comments
- `StatusBadge` - Visual quote status
- `ErrorBoundary` - Catch component errors

## 🔌 API Structure

### Use Supabase Client Directly For:
- Simple CRUD operations
- Real-time subscriptions
- File uploads/downloads

### Use API Routes Only For:
```typescript
// app/api/quotes/[id]/assign-operator/route.ts
POST - Business logic for operator assignment

// app/api/quotes/[id]/calculate-pricing/route.ts
POST - Server-side pricing calculations

// app/api/quotes/[id]/send-quote/route.ts
POST - Generate PDF + send email atomically

// app/api/files/validate-dxf/route.ts
POST - Parse and validate DXF structure

// app/api/webhooks/mollie/route.ts
POST - Payment webhook (idempotent)
```

## 💾 State Management

### Keep It Simple
```typescript
// ✅ DO: Use React state + Supabase real-time
const [quotes, setQuotes] = useState<Quote[]>([])

useEffect(() => {
  // Subscribe to quote changes for current user only
  const subscription = supabase
    .channel('quotes')
    .on('postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'quotes',
        filter: `customer_id=eq.${user.id}` // Filter at subscription level!
      },
      handleQuoteChange
    )
    .subscribe()
}, [])

// ❌ DON'T: Complex state management libraries (Redux, MobX, etc.)
```

## 📤 File Upload Strategy

### Storage Structure
```
/dxf-files/{user_id}/{quote_id}/{filename}.dxf
/pdf-files/{user_id}/{quote_id}/{filename}.pdf
/quote-pdfs/{quote_id}/quote-{number}.pdf
/invoice-pdfs/{order_id}/invoice-{number}.pdf
```

### Upload Flow
```typescript
// 1. Client-side: Basic validation
const validateFile = (file: File) => {
  const validTypes = ['.dxf', '.pdf']
  const maxSize = 50 * 1024 * 1024 // 50MB
  // Check extension and size only
}

// 2. Upload to Supabase Storage
const { data, error } = await supabase.storage
  .from('dxf-files')
  .upload(path, file)

// 3. Server-side: Actual validation
// api/files/validate-dxf/route.ts
// - Parse DXF structure
// - Extract dimensions
// - Check for malicious content
```

## 🔐 Security & Error Handling

### Error Boundaries
```typescript
// components/shared/error-boundary.tsx
export function QuoteErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={<ErrorFallback />}
      onError={(error) => {
        // Log to monitoring service
        console.error('Quote error:', error)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
```

### Error Types
```typescript
// lib/errors/types.ts
export class BusinessError extends Error {
  constructor(message: string, public code: string) {
    super(message)
  }
}

export class ValidationError extends BusinessError {}
export class AuthorizationError extends BusinessError {}
export class PaymentError extends BusinessError {}
```

### Loading States
```typescript
// Use Suspense for data fetching
<Suspense fallback={<QuoteListSkeleton />}>
  <CustomerQuoteList />
</Suspense>

// Use loading state for mutations
const [isSubmitting, setIsSubmitting] = useState(false)
```

## 🇳🇱 Dutch Language Implementation

### Simple Approach (Start Here)
```typescript
// lib/translations/nl.ts
export const nl = {
  quote: {
    title: 'Offerte',
    new: 'Nieuwe offerte',
    status: {
      pending: 'In behandeling',
      needs_attention: 'Actie vereist',
      sent: 'Verzonden',
      accepted: 'Geaccepteerd',
      declined: 'Afgewezen',
      expired: 'Verlopen'
    }
  },
  errors: {
    required: 'Dit veld is verplicht',
    invalidFile: 'Ongeldig bestandstype'
  }
}

// Usage
import { nl } from '@/lib/translations/nl'
<h1>{nl.quote.title}</h1>
```

## 🚀 Implementation Phases

### Phase 1: Core Quote Flow (Current)
- [x] Auth system with roles
- [x] Database structure
- [x] Basic dashboards
- [ ] Quote creation form
- [ ] File upload
- [ ] Quote list views
- [ ] Basic comments

### Phase 2: Processing
- [ ] Operator quote processing
- [ ] Admin pricing interface
- [ ] Quote PDF generation
- [ ] Email notifications

### Phase 3: Payments & Orders
- [ ] Mollie integration
- [ ] Order creation
- [ ] Production tracking
- [ ] Invoice generation

### Phase 4: Polish
- [ ] Error handling
- [ ] Loading states
- [ ] Performance optimization
- [ ] Admin tools

## ⚠️ Critical Implementation Notes

### 1. Business Logic MUST Be Server-Side
```typescript
// ❌ NEVER trust client calculations
const clientPrice = material.price * area * 2

// ✅ ALWAYS calculate on server
const { data: pricing } = await fetch('/api/quotes/calculate-pricing', {
  method: 'POST',
  body: JSON.stringify({ lineItems })
})
```

### 2. Use Supabase RLS, Don't Fight It
```typescript
// ❌ DON'T: Check permissions in middleware
if (user.role !== 'admin') return forbidden()

// ✅ DO: Let RLS handle it
const { data } = await supabase
  .from('quotes')
  .select('*') // RLS automatically filters
```

### 3. Keep Components Simple
```typescript
// ❌ DON'T: One component doing everything
<QuoteManager
  canEdit={true}
  canDelete={role === 'admin'}
  showPricing={role !== 'customer'}
/>

// ✅ DO: Separate concerns
<CustomerQuoteView quote={quote} />
<OperatorPricingPanel quote={quote} />
<AdminControls quote={quote} />
```

### 4. Handle Errors Gracefully
```typescript
// Every mutation needs error handling
const handleSubmit = async (data: QuoteFormData) => {
  try {
    setIsSubmitting(true)
    const result = await createQuote(data)
    router.push(`/klant/quote/${result.id}`)
  } catch (error) {
    if (error instanceof ValidationError) {
      setFormError(error.message)
    } else {
      toast.error('Er is iets misgegaan. Probeer het opnieuw.')
    }
  } finally {
    setIsSubmitting(false)
  }
}
```

## 📝 Database Integration (Already Configured)

### Available Tables
- `profiles` - User profiles with roles
- `quotes` - Quote records with status
- `line_items` - Individual items per quote
- `comments` - Quote discussions
- `materials` - Available materials
- `orders` - Accepted quotes
- `email_queue` - Email notifications

### Key Functions (In Supabase)
- `generate_sequential_id()` - Quote numbers (Q00001)
- `validate_quote_status_transition()` - Status rules
- `expire_old_quotes()` - 14-day expiry
- `process_successful_payment()` - Payment handling

## 🔑 Key Business Rules (Enforced by Database)

1. **Quote Numbering**: Sequential Q00001, Q00002...
2. **Revisions**: Q00001-R1, Q00001-R2...
3. **Status Flow**: Enforced by triggers
4. **14-Day Expiry**: Automatic via cron
5. **Single Operator**: One operator per quote
6. **File Requirements**: DXF + PDF required

## 🎯 Success Metrics

- Quote creation < 5 minutes
- Operator processing < 10 minutes
- Admin pricing < 5 minutes
- Page load < 1 second
- Zero data leaks between customers
- 100% quote number uniqueness

---

**Remember: Build the simplest thing that works. Add complexity only when proven necessary.**