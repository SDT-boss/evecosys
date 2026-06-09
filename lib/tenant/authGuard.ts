import 'server-only'
import type { DatabaseClient, Tenant } from '@/lib/tenant/types'
import { AuthSessionError, TenantAccessError } from '@/lib/tenant/types'

export interface AuthGuardResult {
  user: { id: string }
  tenant: Tenant
}

export class TenantAuthGuard {
  constructor(private readonly db: DatabaseClient) {}

  async requireSession(tenantId: string): Promise<AuthGuardResult> {
    const { user, error } = await this.db.getUser()
    if (error || !user) {
      throw new AuthSessionError('No valid auth session')
    }

    const { data: tenant, error: tenantError } = await this.db.getTenantRow(tenantId)
    // Pitfall 3: RLS returns zero rows (data === null, error === null) for a
    // cross-tenant query. Reject on null data, not only on error.
    if (tenantError || !tenant) {
      throw new AuthSessionError(`Tenant ${tenantId} not found`)
    }

    if (user.id !== tenant.owner_id) {
      throw new TenantAccessError(tenantId, user.id)
    }

    return { user, tenant }
  }
}
