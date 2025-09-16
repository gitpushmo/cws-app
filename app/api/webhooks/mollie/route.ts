import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Mollie webhooks don't require user authentication - they use webhook signing
    const body = await request.text()
    const signature = request.headers.get('mollie-signature')

    // CRITICAL: Webhook signature verification not implemented
    // This is a MAJOR security issue - you MUST verify webhook signatures
    // For production, you need to:
    // 1. Install @mollie/api-client
    // 2. Verify webhook signature using Mollie secret
    // 3. Only then process the payment

    console.warn('Mollie webhook signature verification not implemented - SECURITY RISK')

    if (!signature) {
      console.error('Missing Mollie signature header')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Parse webhook payload
    let webhookData
    try {
      webhookData = JSON.parse(body)
    } catch (error) {
      console.error('Invalid JSON in webhook payload:', error)
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }

    const { id: paymentId, resource } = webhookData

    if (resource !== 'payment') {
      console.log('Ignoring non-payment webhook:', resource)
      return NextResponse.json({ received: true })
    }

    if (!paymentId) {
      console.error('Missing payment ID in webhook')
      return NextResponse.json(
        { error: 'Missing payment ID' },
        { status: 400 }
      )
    }

    // TODO: Verify payment status with Mollie API
    // For now, simulate the check
    console.log('Processing Mollie webhook for payment:', paymentId)

    const supabase = await createClient()

    // Find quote by payment ID (you'll need to store this when creating payments)
    // This is a placeholder - you need to implement payment tracking
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, status, total_customer_price')
      .eq('mollie_payment_id', paymentId)
      .single()

    if (quoteError) {
      if (quoteError.code === 'PGRST116') {
        console.error('No quote found for payment ID:', paymentId)
        return NextResponse.json(
          { error: 'Quote not found' },
          { status: 404 }
        )
      }
      console.error('Error finding quote:', quoteError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    // TODO: Get actual payment status from Mollie API
    // const molliePayment = await mollieClient.payments.get(paymentId)
    // For now, assume payment is successful
    const paymentStatus = 'paid' // This should come from Mollie API

    let newQuoteStatus = quote.status
    let updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (paymentStatus === 'paid') {
      if (quote.status === 'sent') {
        newQuoteStatus = 'accepted'
        updateData.accepted_at = new Date().toISOString()
        updateData.status = 'accepted'
      }
      updateData.payment_status = 'paid'

    } else if (paymentStatus === 'failed' || paymentStatus === 'expired') {
      updateData.payment_status = 'failed'

    } else if (paymentStatus === 'canceled') {
      updateData.payment_status = 'canceled'
    }

    // Update quote with payment information
    const { error: updateError } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', quote.id)

    if (updateError) {
      console.error('Error updating quote with payment status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update quote' },
        { status: 500 }
      )
    }

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('comments')
      .insert({
        quote_id: quote.id,
        author_id: null, // System comment
        content: `Payment ${paymentStatus}: ${paymentId}`,
        visibility: 'internal'
      })

    if (auditError) {
      console.error('Error creating audit log:', auditError)
      // Don't fail the webhook for audit errors
    }

    console.log(`Payment ${paymentId} processed: ${paymentStatus}`)

    return NextResponse.json({
      received: true,
      processed: true,
      payment_id: paymentId,
      quote_id: quote.id,
      status: paymentStatus
    })

  } catch (error) {
    console.error('Unexpected error in Mollie webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}