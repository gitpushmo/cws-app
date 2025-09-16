# Tech Stack

## Core Infrastructure
- **Database & Auth**: Supabase
  - PostgreSQL database
  - Row Level Security (RLS)
  - Built-in authentication
  - Real-time subscriptions (optional)
  - File storage for DXF/PDF files

## Frontend
- **Framework**: Next.js 15+ (App Router)
- **UI Components**: Shadcn/ui
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Backend Services
- **Payment Processing**: Mollie
  - Payment links
  - Webhook handling
  - Invoice management

- **Email Service**: Resend
  - Transactional emails
  - Quote notifications
  - Order confirmations

## Development Tools
- **Package Manager**: npm/pnpm
- **Version Control**: Git
- **Type Safety**: TypeScript + Zod (validation)

## Architecture Pattern
- Server Components (default)
- Client Components (where needed)
- API Routes for webhooks
- Direct Supabase client for data fetching
