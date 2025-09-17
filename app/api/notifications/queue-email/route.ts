import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Email templates as defined in quote-flow.md
const EMAIL_TEMPLATES = {
  new_quote_created: {
    subject: 'Nieuwe offerte in wachtrij',
    recipients: ['operators'] // Will resolve to actual operator emails
  },
  quote_needs_attention: {
    subject: 'Actie vereist voor offerte',
    recipients: ['customer']
  },
  quote_sent: {
    subject: 'Offerte klaar voor beoordeling',
    recipients: ['customer']
  },
  revision_sent: {
    subject: 'Bijgewerkte offerte klaar',
    recipients: ['customer']
  },
  quote_accepted: {
    subject: 'Offerte geaccepteerd',
    recipients: ['admin']
  },
  revision_requested: {
    subject: 'Revisie verzoek ontvangen',
    recipients: ['admin']
  }
}

type EmailTemplateId = keyof typeof EMAIL_TEMPLATES

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication - this is an internal API for the system
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      )
    }

    const {
      template_id,
      quote_id,
      recipient_override
    }: {
      template_id: EmailTemplateId
      quote_id: number
      recipient_override?: string
    } = await request.json()

    if (!template_id || !quote_id) {
      return NextResponse.json(
        { error: 'Template ID en quote ID zijn verplicht' },
        { status: 400 }
      )
    }

    if (!EMAIL_TEMPLATES[template_id]) {
      return NextResponse.json(
        { error: 'Onbekende email template' },
        { status: 400 }
      )
    }

    // Get quote data for email context
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        id,
        quote_number,
        status,
        total_customer_price,
        deadline,
        customer_id,
        operator_id,
        profiles:customer_id (
          name,
          email,
          company_name
        )
      `)
      .eq('id', quote_id)
      .single()

    if (quoteError) {
      console.error('Error fetching quote for email:', quoteError)
      return NextResponse.json(
        { error: 'Fout bij ophalen offerte gegevens' },
        { status: 500 }
      )
    }

    const template = EMAIL_TEMPLATES[template_id]
    const emailsToQueue: Array<{
      to_email: string
      template_id: string
      template_data: any
    }> = []

    // Determine recipients
    for (const recipientType of template.recipients) {
      if (recipient_override) {
        // Use override email if provided
        emailsToQueue.push({
          to_email: recipient_override,
          template_id,
          template_data: {
            quote_number: quote.quote_number,
            quote_id: quote.id,
            customer_name: quote.profiles?.name,
            customer_email: quote.profiles?.email,
            company_name: quote.profiles?.company_name,
            total_amount: quote.total_customer_price,
            deadline: quote.deadline,
            status: quote.status
          }
        })
      } else {
        // Resolve recipient based on type
        if (recipientType === 'customer') {
          if (quote.profiles?.email) {
            emailsToQueue.push({
              to_email: quote.profiles.email,
              template_id,
              template_data: {
                quote_number: quote.quote_number,
                customer_name: quote.profiles.name,
                total_amount: quote.total_customer_price,
                deadline: quote.deadline
              }
            })
          }
        } else if (recipientType === 'admin') {
          // TODO: Get admin emails from environment or settings
          const adminEmail = process.env.ADMIN_EMAIL || 'admin@company.com'
          emailsToQueue.push({
            to_email: adminEmail,
            template_id,
            template_data: {
              quote_number: quote.quote_number,
              quote_id: quote.id,
              customer_name: quote.profiles?.name,
              customer_email: quote.profiles?.email,
              total_amount: quote.total_customer_price
            }
          })
        } else if (recipientType === 'operators') {
          // Get all active operators
          const { data: operators } = await supabase
            .from('profiles')
            .select('email')
            .eq('role', 'operator')

          if (operators) {
            for (const operator of operators) {
              if (operator.email) {
                emailsToQueue.push({
                  to_email: operator.email,
                  template_id,
                  template_data: {
                    quote_number: quote.quote_number,
                    quote_id: quote.id,
                    customer_name: quote.profiles?.name
                  }
                })
              }
            }
          }
        }
      }
    }

    // Insert emails into queue
    if (emailsToQueue.length > 0) {
      const { data: queuedEmails, error: queueError } = await supabase
        .from('email_queue')
        .insert(emailsToQueue)
        .select()

      if (queueError) {
        console.error('Error queueing emails:', queueError)
        return NextResponse.json(
          { error: 'Fout bij toevoegen emails aan wachtrij', details: queueError.message },
          { status: 500 }
        )
      }

      // Add audit log
      await supabase
        .from('audit_log')
        .insert({
          table_name: 'email_queue',
          record_id: quote_id.toString(),
          action: 'emails_queued',
          user_id: user.id,
          new_data: {
            template_id,
            emails_count: emailsToQueue.length,
            recipients: emailsToQueue.map(e => e.to_email)
          }
        })

      return NextResponse.json({
        message: `${emailsToQueue.length} email(s) toegevoegd aan wachtrij`,
        template_id,
        emails_queued: queuedEmails.length,
        quote_number: quote.quote_number
      })
    } else {
      return NextResponse.json({
        message: 'Geen ontvangers gevonden voor email template',
        template_id,
        quote_number: quote.quote_number
      })
    }

  } catch (error) {
    console.error('Unexpected error in POST /api/notifications/queue-email:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}

// GET endpoint to check email queue status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      )
    }

    // Get user profile - only admins can check email queue
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Alleen admins kunnen email wachtrij bekijken' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'pending'
    const limit = parseInt(searchParams.get('limit') || '50')

    const { data: emailQueue, error: queueError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (queueError) {
      console.error('Error fetching email queue:', queueError)
      return NextResponse.json(
        { error: 'Fout bij ophalen email wachtrij' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      emails: emailQueue,
      status,
      count: emailQueue.length
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/notifications/queue-email:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}