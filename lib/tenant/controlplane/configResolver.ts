import { isRoutable } from '@/lib/tenant/controlplane/types'
import type { ControlPlaneReadStore, ControlPlaneSnapshot } from '@/lib/tenant/controlplane/types'

/**
 * Assembles a tenant-scoped control-plane snapshot for downstream consumers
 * (routing, feature flags, metering, cross-platform clients). The caller is
 * responsible for validating tenant context (see the API route guard); this
 * resolver only reads the given tenant's state.
 */
export class ControlPlaneConfigResolver {
  constructor(private readonly store: ControlPlaneReadStore) {}

  async resolve(tenantId: string): Promise<ControlPlaneSnapshot | null> {
    const base = await this.store.getStateAndFlags(tenantId)
    if (!base) return null

    const [config, metering] = await Promise.all([
      this.store.getConfig(tenantId),
      this.store.getMetering(tenantId),
    ])

    return {
      tenantId,
      status: base.state,
      routable: isRoutable(base.state),
      featureFlags: base.featureFlags,
      config: config ?? {},
      metering,
    }
  }
}
