import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type AdminGuardResult =
  | { user: { id: string; email: string } }
  | { error: NextResponse }

/**
 * Validates the caller is an authenticated platform_admin. Uses only the
 * request-scoped (RLS) client — never the service-role client — so an
 * unauthorized caller cannot trigger privileged reads/writes.
 */
export async function requirePlatformAdmin(): Promise<AdminGuardResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'platform_admin') {
    return { error: NextResponse.json({ error: 'Forbidden — platform_admin role required' }, { status: 403 }) }
  }
  return { user: { id: user.id, email: user.email ?? user.id } }
}
