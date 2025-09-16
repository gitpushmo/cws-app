import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Get user profile for role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Gebruikersprofiel niet gevonden' },
        { status: 404 }
      )
    }

    // Get search parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const customer = searchParams.get('customer') // customer name or email
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const quoteNumber = searchParams.get('quote_number')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build base query
    let query = supabase
      .from('quotes')
      .select(`
        id,
        quote_number,
        revision_number,
        status,
        deadline,
        total_customer_price,
        created_at,
        sent_at,
        accepted_at,
        declined_at,
        profiles!quotes_customer_id_fkey (
          name,
          email,
          company_name
        ),
        operator:profiles!quotes_operator_id_fkey (
          name,
          email
        )
      `, { count: 'exact' })

    // Apply role-based filters
    if (profile.role === 'customer') {
      query = query.eq('customer_id', user.id)
    } else if (profile.role === 'operator') {
      query = query.eq('operator_id', user.id)
    }
    // Admin sees all quotes (no filter)

    // Apply search filters
    if (status) {
      query = query.eq('status', status)
    }

    if (quoteNumber) {
      query = query.ilike('quote_number', `%${quoteNumber}%`)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    // Customer search is more complex - need to filter by customer name/email/company
    if (customer && profile.role !== 'customer') {
      // This requires a more complex query with OR conditions
      // We'll use a stored procedure or a simpler approach for now
      const customerSearch = customer.toLowerCase()

      // Get all quotes first, then filter in memory (not ideal for large datasets)
      // In production, consider using full-text search or a stored procedure
      const { data: allQuotes, count } = await query
        .order('created_at', { ascending: false })
        .range(0, 1000) // Get more records to filter

      if (allQuotes) {
        const filteredQuotes = allQuotes.filter(quote => {
          const customerData = quote.profiles
          if (!customerData) return false

          const nameMatch = customerData.name?.toLowerCase().includes(customerSearch)
          const emailMatch = customerData.email?.toLowerCase().includes(customerSearch)
          const companyMatch = customerData.company_name?.toLowerCase().includes(customerSearch)

          return nameMatch || emailMatch || companyMatch
        })

        // Apply pagination to filtered results
        const paginatedQuotes = filteredQuotes.slice(offset, offset + limit)

        return NextResponse.json({
          data: paginatedQuotes,
          pagination: {
            page,
            limit,
            total: filteredQuotes.length,
            pages: Math.ceil(filteredQuotes.length / limit)
          }
        })
      }
    }

    // Execute query with pagination
    const { data: quotes, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error searching quotes:', error)
      return NextResponse.json(
        { error: 'Fout bij zoeken offertes', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: quotes || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/quotes/search:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}