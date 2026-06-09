import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * createServiceClient — centralized service-role Supabase client.
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS. NEVER import this from
 * a Client Component — the `server-only` marker makes that a build error.
 * Call this inside server-side request handlers, not at module scope
 * (the key must not be required at import time — see Pitfall 4).
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
