import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Define public routes (including auth-related pages and all API routes)
  const publicRoutes = ['/auth', '/api', '/']
  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + '/')
  )

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  // If user is authenticated, check email verification status
  if (user && !isPublicRoute) {
    // Check if email is verified
    if (!user.email_confirmed_at) {
      // User exists but email not verified - redirect to check email page
      const url = request.nextUrl.clone()
      url.pathname = '/auth/check-email'
      url.searchParams.set('email', user.email || '')
      return NextResponse.redirect(url)
    }

    // Get user profile to determine role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // If profile doesn't exist, redirect to auth page
    if (error || !profile) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth'
      url.searchParams.set('error', 'profile_not_found')
      return NextResponse.redirect(url)
    }

    // Role-based route protection
    const currentPath = request.nextUrl.pathname
    const userRole = profile.role

    // Define role-based route access
    const roleRoutes: Record<string, string[]> = {
      admin: ['/admin', '/operator', '/klant'],
      operator: ['/operator', '/klant'],
      customer: ['/klant'],
    }

    const allowedPaths = roleRoutes[userRole] || ['/klant']
    const hasAccess = allowedPaths.some(path => currentPath.startsWith(path))

    if (!hasAccess) {
      // Redirect to user's default dashboard
      const url = request.nextUrl.clone()
      if (userRole === 'admin') {
        url.pathname = '/admin'
      } else if (userRole === 'operator') {
        url.pathname = '/operator'
      } else {
        url.pathname = '/klant'
      }
      return NextResponse.redirect(url)
    }
  }

  // If user is authenticated and on auth page, redirect based on role
  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    // Check email verification first
    if (!user.email_confirmed_at) {
      // Allow access to verification-related auth pages
      const allowedAuthPages = ['/auth/check-email', '/auth/verification-error']
      const isAllowedAuthPage = allowedAuthPages.some(page =>
        request.nextUrl.pathname.startsWith(page)
      )

      if (!isAllowedAuthPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/check-email'
        url.searchParams.set('email', user.email || '')
        return NextResponse.redirect(url)
      }

      return supabaseResponse
    }

    // Get user profile to determine role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const url = request.nextUrl.clone()

    // If profile doesn't exist or there's an error, stay on auth page to show error
    if (error || !profile) {
      // Allow access to auth page to show profile creation error
      return supabaseResponse
    }

    // Redirect verified users to their dashboard
    if (profile.role === 'customer') {
      url.pathname = '/klant'
    } else if (profile.role === 'operator') {
      url.pathname = '/operator'
    } else if (profile.role === 'admin') {
      url.pathname = '/admin'
    } else {
      // Fallback for users without valid roles
      url.pathname = '/klant'
    }

    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}