import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { VaultStore, StoredSecret } from '@/lib/tenant/vault'
import { VaultStorageError } from '@/lib/tenant/vault'

/**
 * SupabaseVaultStore
 *
 * Concrete VaultStore that delegates to Supabase Vault through the service-role
 * admin client.  Two security-sensitive RPCs are used:
 *   - store_byodb_secret(p_name, p_secret) → uuid (secret id)
 *   - delete_byodb_secret(p_secret_id)     → void
 *
 * The `secret` value is passed only as the `p_secret` RPC argument and is never
 * written to a log or included in error messages.
 *
 * Passing an existing SupabaseClient via the constructor keeps the class
 * unit-testable without environment variables.
 */
export class SupabaseVaultStore implements VaultStore {
  private readonly client: SupabaseClient

  constructor(client?: SupabaseClient) {
    if (client) {
      this.client = client
    } else {
      this.client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      )
    }
  }

  async store(name: string, secret: string): Promise<StoredSecret> {
    const { data, error } = await this.client.rpc('store_byodb_secret', {
      p_name: name,
      p_secret: secret,
    })

    if (error || !data) {
      throw new VaultStorageError(
        `Vault store failed: ${error?.message ?? 'no secret id returned'}`,
      )
    }

    return { secretId: data as string }
  }

  async delete(secretId: string): Promise<void> {
    const { error } = await this.client.rpc('delete_byodb_secret', {
      p_secret_id: secretId,
    })

    if (error) {
      throw new VaultStorageError(`Vault delete failed: ${error.message}`)
    }
  }
}
