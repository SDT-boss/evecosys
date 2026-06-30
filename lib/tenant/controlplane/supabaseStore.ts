import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tenant, TenantState } from '@/lib/tenant/types'
import type {
  ControlPlaneStore,
  CredentialRotationStore,
  ControlPlaneReadStore,
} from '@/lib/tenant/controlplane/types'

/**
 * Supabase-backed control-plane store (service-role client, RLS-bypassing).
 * Implements lifecycle state read/write, the Vault secret reference, and the
 * read surface for config distribution. Every query is scoped by tenantId.
 */
export class SupabaseControlPlaneStore
  implements ControlPlaneStore, CredentialRotationStore, ControlPlaneReadStore
{
  constructor(private readonly client: SupabaseClient) {}

  async getTenant(tenantId: string): Promise<Tenant | null> {
    const { data, error } = await this.client
      .from('tenants')
      .select('id, owner_id, name, state, created_at, updated_at')
      .eq('id', tenantId)
      .maybeSingle()
    if (error) throw new Error(`getTenant failed: ${error.message}`)
    return (data as Tenant | null) ?? null
  }

  async setTenantState(tenantId: string, state: TenantState): Promise<void> {
    const { error } = await this.client.from('tenants').update({ state }).eq('id', tenantId)
    if (error) throw new Error(`setTenantState failed: ${error.message}`)
  }

  async getVaultSecretId(tenantId: string): Promise<string | null> {
    const { data, error } = await this.client
      .from('tenants').select('vault_secret_id').eq('id', tenantId).maybeSingle()
    if (error) throw new Error(`getVaultSecretId failed: ${error.message}`)
    return (data?.vault_secret_id as string | null) ?? null
  }

  async setVaultSecretId(tenantId: string, secretId: string | null): Promise<void> {
    const { error } = await this.client
      .from('tenants').update({ vault_secret_id: secretId }).eq('id', tenantId)
    if (error) throw new Error(`setVaultSecretId failed: ${error.message}`)
  }

  async getStateAndFlags(
    tenantId: string,
  ): Promise<{ state: TenantState; featureFlags: Record<string, boolean> } | null> {
    const { data, error } = await this.client
      .from('tenants').select('state, feature_flags').eq('id', tenantId).maybeSingle()
    if (error) throw new Error(`getStateAndFlags failed: ${error.message}`)
    if (!data) return null
    return {
      state: data.state as TenantState,
      featureFlags: (data.feature_flags as Record<string, boolean> | null) ?? {},
    }
  }

  async getConfig(tenantId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.client
      .from('tenant_config').select('settings').eq('tenant_id', tenantId).maybeSingle()
    if (error) throw new Error(`getConfig failed: ${error.message}`)
    return (data?.settings as Record<string, unknown> | null) ?? null
  }

  async getMetering(
    tenantId: string,
  ): Promise<{ bytesUsed: number; quotaBytes: number } | null> {
    const { data, error } = await this.client
      .from('tenant_storage_metering').select('bytes_used, quota_bytes').eq('tenant_id', tenantId).maybeSingle()
    if (error) throw new Error(`getMetering failed: ${error.message}`)
    if (!data) return null
    return { bytesUsed: data.bytes_used as number, quotaBytes: data.quota_bytes as number }
  }
}
