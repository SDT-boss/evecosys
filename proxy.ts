import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_ROUTES: Record<string, string> = {
  platform_admin: '/platform',
  manager: '/manager',
  board: '/board',
  driver: '/driver',
}

const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password']

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

  if (isPublic) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
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
    console.error('[proxy] supabase.auth.getUser failed:', err)
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const profile = await getProfile(supabase, user.id)

  // Fall back to user_metadata.role if DB query fails (e.g. RLS miss during first request)
  const role: string | undefined = profile?.role
    ?? (user.user_metadata?.role as string | undefined)
  console.log('[proxy]', pathname, '| user:', user.email, '| profile.role:', profile?.role ?? 'null', '| metadata.role:', user.user_metadata?.role ?? 'null')

  const forceReset = isForceResetDue(profile?.force_password_reset_at ?? null)
  if (forceReset && !pathname.startsWith('/reset-password')) {
    return NextResponse.redirect(new URL('/reset-password?forced=true', request.url))
  }

  if (role) {
    // Trusted server-set headers — overwrite any client-supplied values
    requestHeaders.set('x-user-role', role)
    requestHeaders.set('x-user-id', user.id)
    supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

    const allowedPrefix = ROLE_ROUTES[role]
    if (pathname === '/') {
      return NextResponse.redirect(new URL(allowedPrefix ?? '/login', request.url))
    }
    if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
      return NextResponse.redirect(new URL(allowedPrefix, request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
}
