'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/**
 * Sets the active tenant context for the platform admin session.
 * Writes a session-duration cookie (no maxAge per D-07) and revalidates the
 * layout so ActiveTenantIndicator updates on the next render cycle.
 *
 * Cookie options:
 *   - httpOnly: false  — client must be able to read it for Phase 3 optimistic UI (D-07)
 *   - No maxAge       — session-duration cookie (D-07)
 *
 * Returns ActionResult { ok: boolean; error?: string } (D-06, Phase 3).
 * On cookie failure, returns { ok: false, error } instead of throwing so the
 * client can handle the error without try/catch at the call site.
 */
export async function setActiveTenant(
  tenantId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const cookieStore = await cookies()
    cookieStore.set('platform_active_tenant', tenantId, {
      path: '/platform',
      httpOnly: false, // D-07: client must read for Phase 3 optimistic UI
      // No maxAge = session-duration cookie (D-07)
    })
    revalidatePath('/platform', 'layout') // 'layout' type REQUIRED — see 02-RESEARCH Pitfall 1
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Cookie write failed',
    }
  }
}
