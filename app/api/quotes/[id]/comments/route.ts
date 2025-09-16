import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Comment {
  id: number
  quote_id: number
  author_id: string
  content: string
  visibility: 'public' | 'internal'
  created_at: string
  profiles: {
    name: string
    role: string
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await context.params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profiel niet gevonden' },
        { status: 403 }
      )
    }

    // Verify access to quote
    const { data: quote } = await supabase
      .from('quotes')
      .select('id, customer_id')
      .eq('id', quoteId)
      .single()

    if (!quote) {
      return NextResponse.json(
        { error: 'Offerte niet gevonden' },
        { status: 404 }
      )
    }

    // Check if user has access to this quote
    const hasAccess = profile.role === 'admin' ||
                     profile.role === 'operator' ||
                     (profile.role === 'customer' && quote.customer_id === user.id)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Geen toegang tot deze offerte' },
        { status: 403 }
      )
    }

    // Build visibility filter based on user role
    let visibilityFilter: string[] = []
    if (profile.role === 'customer') {
      visibilityFilter = ['public'] // Customers only see public comments
    } else {
      visibilityFilter = ['public', 'internal'] // Operators and admins see all comments
    }

    // Get comments with author info
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        id,
        quote_id,
        author_id,
        content,
        visibility,
        created_at,
        profiles!author_id (
          name,
          role
        )
      `)
      .eq('quote_id', quoteId)
      .in('visibility', visibilityFilter)
      .order('created_at', { ascending: true }) as { data: Comment[] | null, error: unknown }

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json(
        { error: 'Fout bij ophalen reacties' },
        { status: 500 }
      )
    }

    return NextResponse.json(comments || [])

  } catch (error) {
    console.error('Unexpected error in GET /api/quotes/[id]/comments:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await context.params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profiel niet gevonden' },
        { status: 403 }
      )
    }

    // Verify access to quote
    const { data: quote } = await supabase
      .from('quotes')
      .select('id, customer_id')
      .eq('id', quoteId)
      .single()

    if (!quote) {
      return NextResponse.json(
        { error: 'Offerte niet gevonden' },
        { status: 404 }
      )
    }

    // Check if user has access to this quote
    const hasAccess = profile.role === 'admin' ||
                     profile.role === 'operator' ||
                     (profile.role === 'customer' && quote.customer_id === user.id)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Geen toegang tot deze offerte' },
        { status: 403 }
      )
    }

    // Parse request body
    const { content, visibility = 'public' } = await request.json()

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Reactie inhoud is verplicht' },
        { status: 400 }
      )
    }

    // Validate visibility - customers can only create public comments
    if (profile.role === 'customer' && visibility !== 'public') {
      return NextResponse.json(
        { error: 'Klanten kunnen alleen openbare reacties plaatsen' },
        { status: 400 }
      )
    }

    // Create comment
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        quote_id: parseInt(quoteId),
        author_id: user.id,
        content: content.trim(),
        visibility: visibility
      })
      .select(`
        id,
        quote_id,
        author_id,
        content,
        visibility,
        created_at,
        profiles!author_id (
          name,
          role
        )
      `)
      .single() as { data: Comment | null, error: unknown }

    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json(
        { error: 'Fout bij aanmaken reactie' },
        { status: 500 }
      )
    }

    return NextResponse.json(comment, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in POST /api/quotes/[id]/comments:', error)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500 }
    )
  }
}