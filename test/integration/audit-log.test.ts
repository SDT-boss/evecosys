/**
 * Integration suite: tamper-evident audit_logs (EVE-55)
 *
 * Runs against a REAL local Supabase instance.
 * Prerequisites: `make db-start` && `make migrate`; .env.local with
 * NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
 * Run: `make test-integration`
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ws = require('ws') as typeof WebSocket
import { SupabaseAuditRecorder } from '@/lib/audit/supabaseAuditRecorder'
import type { AuditRecordInput } from '@/lib/audit/types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasEnv = Boolean(url && anonKey && serviceKey)

describe.skipIf(!hasEnv)('audit_logs integration', () => {
  let admin: SupabaseClient
  let userAEmail: string
  let userBEmail: string
  let userAId: string
  let userBId: string
  let tenantA: string
  let tenantB: string
  const password = 'Audit-Test-P@ss1!'

  async function insertTenant(ownerId: string): Promise<string> {
    const { data, error } = await admin
      .from('tenants').insert({ owner_id: ownerId, state: 'Active' }).select('id').single()
    if (error || !data) throw new Error(`insert tenant failed: ${error?.message}`)
    return data.id as string
  }

  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, { realtime: { transport: ws } })
    userAEmail = `audit-a-${Date.now()}@integration-test.evecosys.local`
    userBEmail = `audit-b-${Date.now()}@integration-test.evecosys.local`
    const a = await admin.auth.admin.createUser({ email: userAEmail, password, email_confirm: true })
    const b = await admin.auth.admin.createUser({ email: userBEmail, password, email_confirm: true })
    userAId = a.data.user!.id
    userBId = b.data.user!.id
    tenantA = await insertTenant(userAId)
    tenantB = await insertTenant(userBId)
  }, 30_000)

  afterAll(async () => {
    // Purge audit rows (only authorized deletion path), then remove fixtures.
    await admin.rpc('purge_audit_logs', { older_than: '0 seconds' })
    if (tenantA) await admin.from('tenants').delete().eq('id', tenantA)
    if (tenantB) await admin.from('tenants').delete().eq('id', tenantB)
    if (userAId) await admin.auth.admin.deleteUser(userAId)
    if (userBId) await admin.auth.admin.deleteUser(userBId)
  })

  function rec(tenantId: string, actorId: string, label: string, action: string): AuditRecordInput {
    return { tenantId, actor: { id: actorId, label, role: 'platform_admin' }, action, outcome: 'ok' }
  }

  it('writes rows and builds a verifiable hash chain', async () => {
    const recorder = new SupabaseAuditRecorder(admin)
    await recorder.record(rec(tenantA, userAId, userAEmail, 'lifecycle.suspend'))
    await recorder.record(rec(tenantA, userAId, userAEmail, 'lifecycle.reactivate'))

    const { data: rows } = await admin
      .from('audit_logs').select('seq, prev_hash, row_hash').order('seq', { ascending: true })
    expect(rows!.length).toBeGreaterThanOrEqual(2)
    // each non-genesis row links to the previous row's hash
    for (let i = 1; i < rows!.length; i++) {
      expect(rows![i].prev_hash).toBe(rows![i - 1].row_hash)
    }

    const { data: verify } = await admin.rpc('verify_audit_chain')
    expect(verify![0].ok).toBe(true)
    expect(verify![0].broken_seq).toBeNull()
  })

  it('rejects UPDATE and DELETE even via the service role (append-only)', async () => {
    const recorder = new SupabaseAuditRecorder(admin)
    await recorder.record(rec(tenantA, userAId, userAEmail, 'config.feature_flags'))
    const { data: one } = await admin
      .from('audit_logs').select('seq').order('seq', { ascending: false }).limit(1).single()

    const upd = await admin.from('audit_logs').update({ action: 'tampered' }).eq('seq', one!.seq)
    expect(upd.error).not.toBeNull()
    expect(upd.error!.message).toMatch(/append-only/i)

    const del = await admin.from('audit_logs').delete().eq('seq', one!.seq)
    expect(del.error).not.toBeNull()
    expect(del.error!.message).toMatch(/append-only/i)
  })

  it('isolates reads by tenant via RLS (userA cannot see tenantB rows)', async () => {
    const recorder = new SupabaseAuditRecorder(admin)
    await recorder.record(rec(tenantB, userBId, userBEmail, 'lifecycle.suspend'))

    const signIn = await createClient(url!, anonKey!, { realtime: { transport: ws } })
      .auth.signInWithPassword({ email: userAEmail, password })
    const userAClient = createClient(url!, anonKey!, {
      realtime: { transport: ws },
      global: { headers: { Authorization: `Bearer ${signIn.data.session!.access_token}` } },
    })

    const blocked = await userAClient.from('audit_logs').select('*').eq('tenant_id', tenantB)
    expect(blocked.error).toBeNull()
    expect(blocked.data).toHaveLength(0)

    const own = await userAClient.from('audit_logs').select('*').eq('tenant_id', tenantA)
    expect(own.error).toBeNull()
    expect(own.data!.length).toBeGreaterThan(0)
  })

  it('purge_audit_logs deletes aged rows and leaves a verifiable chain', async () => {
    // Everything written so far is "now"; purge with a future-proof 0s window
    // removes all, then a fresh write re-anchors the chain.
    const purged = await admin.rpc('purge_audit_logs', { older_than: '0 seconds' })
    expect(purged.error).toBeNull()

    const recorder = new SupabaseAuditRecorder(admin)
    await recorder.record(rec(tenantA, userAId, userAEmail, 'credentials.rotate'))

    const { data: verify } = await admin.rpc('verify_audit_chain')
    expect(verify![0].ok).toBe(true)
  })
})
