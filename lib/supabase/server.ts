import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

/**
 * Creates a Supabase server client scoped to the given tenant.
 * Calls set_active_tenant() via RPC before returning the client so that
 * all subsequent queries in this request are transaction-scoped to tenantId.
 * The session variable is set with transaction-local scope (true) — it resets
 * at transaction end, preventing cross-request data bleed (T-01-03).
 *
 * Used by Phase 3+ platform-admin data queries. Never call this with the
 * service role — platform admin uses the anon key + RLS for scoped access.
 */
export async function createPlatformClient(tenantId: string) {
  const client = await createClient()
  await client.rpc('set_active_tenant', { tenant_id: tenantId })
  return client
}
