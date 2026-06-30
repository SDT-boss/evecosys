import type { Tenant, TenantState } from '@/lib/tenant/types'

export type LifecycleAction = 'suspend' | 'reactivate' | 'decommission' | 'override'

/** A tenant is routable (its workspace may be entered) only when Active. */
export function isRoutable(state: TenantState): boolean {
  return state === 'Active'
}

/** Read/write of tenant lifecycle state. */
export interface ControlPlaneStore {
  getTenant(tenantId: string): Promise<Tenant | null>
  setTenantState(tenantId: string, state: TenantState): Promise<void>
}

/** Read/write of the Vault secret reference for a tenant (rotation + decommission). */
export interface CredentialRotationStore {
  getVaultSecretId(tenantId: string): Promise<string | null>
  setVaultSecretId(tenantId: string, secretId: string | null): Promise<void>
}

/** A tenant-scoped snapshot of control-plane state for downstream consumers. */
export interface ControlPlaneSnapshot {
  tenantId: string
  status: TenantState
  routable: boolean
  featureFlags: Record<string, boolean>
  config: Record<string, unknown>
  metering: { bytesUsed: number; quotaBytes: number } | null
}

/** Reads needed to assemble a ControlPlaneSnapshot. */
export interface ControlPlaneReadStore {
  getStateAndFlags(
    tenantId: string,
  ): Promise<{ state: TenantState; featureFlags: Record<string, boolean> } | null>
  getConfig(tenantId: string): Promise<Record<string, unknown> | null>
  getMetering(tenantId: string): Promise<{ bytesUsed: number; quotaBytes: number } | null>
}
