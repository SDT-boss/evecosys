import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProvisioningDb } from '@/lib/tenant/provisioning/types'
import type { TenantState } from '@/lib/tenant/types'

/**
 * Supabase-backed ProvisioningDb. Constructed with a SERVICE-ROLE client
 * (RLS-bypassing) — provisioning writes are platform operations. Every method is
 * scoped by tenantId so one tenant's provisioning can never touch another's rows.
 */
export class SupabaseProvisioningDb implements ProvisioningDb {
  constructor(private readonly client: SupabaseClient) {}

  async seedConfig(tenantId: string, settings: Record<string, string>): Promise<void> {
    const { error } = await this.client
      .from('tenant_config')
      .upsert({ tenant_id: tenantId, settings }, { onConflict: 'tenant_id' })
    if (error) throw new Error(`seedConfig failed: ${error.message}`)
  }

  async deleteConfig(tenantId: string): Promise<void> {
    const { error } = await this.client.from('tenant_config').delete().eq('tenant_id', tenantId)
    if (error) throw new Error(`deleteConfig failed: ${error.message}`)
  }

  async setFeatureFlags(tenantId: string, flags: Record<string, boolean>): Promise<void> {
    const { error } = await this.client
      .from('tenants')
      .update({ feature_flags: flags })
      .eq('id', tenantId)
    if (error) throw new Error(`setFeatureFlags failed: ${error.message}`)
  }

  async initMetering(tenantId: string, quotaBytes: number): Promise<void> {
    const { error } = await this.client
      .from('tenant_storage_metering')
      .upsert(
        { tenant_id: tenantId, bytes_used: 0, quota_bytes: quotaBytes },
        { onConflict: 'tenant_id' },
      )
    if (error) throw new Error(`initMetering failed: ${error.message}`)
  }

  async deleteMetering(tenantId: string): Promise<void> {
    const { error } = await this.client
      .from('tenant_storage_metering')
      .delete()
      .eq('tenant_id', tenantId)
    if (error) throw new Error(`deleteMetering failed: ${error.message}`)
  }

  async setTenantState(tenantId: string, state: TenantState): Promise<void> {
    const { error } = await this.client
      .from('tenants')
      .update({ state })
      .eq('id', tenantId)
    if (error) throw new Error(`setTenantState failed: ${error.message}`)
  }

  async hasConfig(tenantId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('tenant_config')
      .select('tenant_id')
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (error) throw new Error(`hasConfig failed: ${error.message}`)
    return data !== null
  }

  async hasMetering(tenantId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('tenant_storage_metering')
      .select('tenant_id')
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (error) throw new Error(`hasMetering failed: ${error.message}`)
    return data !== null
  }

  async getFeatureFlags(tenantId: string): Promise<Record<string, boolean> | null> {
    const { data, error } = await this.client
      .from('tenants')
      .select('feature_flags')
      .eq('id', tenantId)
      .maybeSingle()
    if (error) throw new Error(`getFeatureFlags failed: ${error.message}`)
    return (data?.feature_flags as Record<string, boolean> | undefined) ?? null
  }
}
