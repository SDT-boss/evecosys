import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_ROUTES: Record<string, string> = {
  manager: '/manager',
  board: '/board',
  driver: '/driver',
}

const PUBLIC_ROUTES = ['/auth/login', '/auth/signup', '/auth/forgot-password', '/auth/reset-password']

async function getProfile(supabase: ReturnType<typeof createServerClient>, userId: string) {
  const { data } = await supabase
    .from('users')
    .select('role, force_password_reset_at')
    .eq('id', userId)
    .single()
  return data
}

function isForceResetDue(forcePasswordResetAt: string | null): boolean {
  if (!forcePasswordResetAt) return false
  return new Date(forcePasswordResetAt) < new Date()
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const { pathname } = request.nextUrl
  
  // Check if this is a public route first
  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))
  
  // If it's a public route, allow it through without auth checks
  if (isPublic) {
    return supabaseResponse
  }

  // For non-public routes, check authentication
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] = null
  try {
    ;({ data: { user } } = await supabase.auth.getUser())
  } catch (err) {
    console.error('[middleware] supabase.auth.getUser failed:', err)
  }

  // Not logged in — redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Logged in — fetch profile once
  const profile = await getProfile(supabase, user.id)
  const forceReset = isForceResetDue(profile?.force_password_reset_at ?? null)

  // Force password reset takes priority over everything
  if (forceReset && !pathname.startsWith('/auth/reset-password')) {
    return NextResponse.redirect(new URL('/auth/reset-password?forced=true', request.url))
  }

  // Role-based route protection
  if (profile?.role) {
    const allowedPrefix = ROLE_ROUTES[profile.role]
    if (pathname === '/') {
      return NextResponse.redirect(new URL(allowedPrefix, request.url))
    }
    if (!pathname.startsWith(allowedPrefix) && !pathname.startsWith('/auth')) {
      return NextResponse.redirect(new URL(allowedPrefix, request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - .*\\.png$ (PNG images)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
}
