import { describe, it, expect, vi } from 'vitest'
import { SupabaseAuditRecorder } from '@/lib/audit/supabaseAuditRecorder'
import { AuditValidationError, AuditWriteError } from '@/lib/audit/types'
import type { AuditRecordInput } from '@/lib/audit/types'

// Minimal Supabase client stub: client.from('audit_logs').insert(row) -> { error }
function makeClient(insertError: { message: string } | null = null) {
  const insert = vi.fn().mockResolvedValue({ error: insertError })
  const from = vi.fn().mockReturnValue({ insert })
  return { client: { from } as never, from, insert }
}

const VALID: AuditRecordInput = {
  tenantId: '11111111-1111-1111-1111-111111111111',
  actor: { id: '22222222-2222-2222-2222-222222222222', label: 'admin@x.com', role: 'platform_admin' },
  action: 'lifecycle.suspend',
  outcome: 'ok',
  resourceType: 'tenant',
  resourceId: '11111111-1111-1111-1111-111111111111',
}

describe('SupabaseAuditRecorder', () => {
  it('inserts a complete row into audit_logs (field completeness + attribution)', async () => {
    const { client, from, insert } = makeClient()
    await new SupabaseAuditRecorder(client).record(VALID)
    expect(from).toHaveBeenCalledWith('audit_logs')
    expect(insert).toHaveBeenCalledTimes(1)
    const row = insert.mock.calls[0][0]
    expect(row).toMatchObject({
      tenant_id: VALID.tenantId,
      actor_id: VALID.actor.id,
      actor_label: 'admin@x.com',
      actor_role: 'platform_admin',
      action: 'lifecycle.suspend',
      outcome: 'ok',
      resource_type: 'tenant',
      resource_id: VALID.tenantId,
    })
    // hash-chain columns are filled by the DB trigger, never by the app
    expect(row).not.toHaveProperty('row_hash')
    expect(row).not.toHaveProperty('prev_hash')
    expect(row).not.toHaveProperty('seq')
  })

  it('stores actor_id as null when actor.id is not a UUID (system/unknown actor)', async () => {
    const { client, insert } = makeClient()
    await new SupabaseAuditRecorder(client).record({ ...VALID, actor: { ...VALID.actor, id: 'system' } })
    expect(insert.mock.calls[0][0].actor_id).toBeNull()
  })

  it('redacts sensitive keys inside details before insert', async () => {
    const { client, insert } = makeClient()
    await new SupabaseAuditRecorder(client).record({
      ...VALID,
      details: { engine: 'postgres', password: 'hunter2', vault_secret_id: 'byodb/x' },
    })
    expect(insert.mock.calls[0][0].details).toEqual({
      engine: 'postgres',
      password: '[REDACTED]',
      vault_secret_id: '[REDACTED]', // 'secret' substring -> masked; reference is non-essential
    })
  })

  it('throws AuditValidationError when required metadata is missing', async () => {
    const { client } = makeClient()
    const rec = new SupabaseAuditRecorder(client)
    await expect(rec.record({ ...VALID, tenantId: '' })).rejects.toThrow(AuditValidationError)
    await expect(rec.record({ ...VALID, action: '' })).rejects.toThrow(AuditValidationError)
    await expect(rec.record({ ...VALID, actor: { ...VALID.actor, label: '' } })).rejects.toThrow(AuditValidationError)
    // invalid outcome
    await expect(
      rec.record({ ...VALID, outcome: 'maybe' as never }),
    ).rejects.toThrow(AuditValidationError)
  })

  it('throws AuditWriteError when the insert fails', async () => {
    const { client } = makeClient({ message: 'permission denied' })
    await expect(new SupabaseAuditRecorder(client).record(VALID)).rejects.toThrow(AuditWriteError)
  })
})
