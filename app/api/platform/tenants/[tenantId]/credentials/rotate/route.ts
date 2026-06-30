import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requirePlatformAdmin } from '@/lib/platform/requirePlatformAdmin'
import { SupabaseControlPlaneStore } from '@/lib/tenant/controlplane/supabaseStore'
import { CredentialRotationService } from '@/lib/tenant/controlplane/credentialRotation'
import { SupabaseVaultStore } from '@/lib/tenant/vaultStore'
import { RealConnectivityProbe } from '@/lib/tenant/probeDriver'
import { TenantNotFoundError } from '@/lib/tenant/controlplane/errors'
import { CredentialValidationError, type BYODBCredentialInput } from '@/lib/tenant/credentials'
import { ConnectivityError } from '@/lib/tenant/probe'
import { SupabaseAuditRecorder } from '@/lib/audit/supabaseAuditRecorder'
import { DurableControlPlaneAuditSink } from '@/lib/audit/controlPlaneAuditSink'

export async function POST(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params
  const guard = await requirePlatformAdmin()
  if ('error' in guard) return guard.error

  let input: unknown
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 })
  }

  const admin = createServiceClient()
  const auditSink = new DurableControlPlaneAuditSink(new SupabaseAuditRecorder(admin), {
    id: guard.user.id,
    label: guard.user.email,
    role: 'platform_admin',
  })
  const service = new CredentialRotationService(
    new SupabaseControlPlaneStore(admin),
    new RealConnectivityProbe(),
    new SupabaseVaultStore(admin),
    auditSink,
  )

  try {
    const result = await service.rotate(tenantId, input as BYODBCredentialInput, guard.user.email)
    return NextResponse.json({ ok: true, secretId: result.secretId })
  } catch (err) {
    if (err instanceof TenantNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 })
    if (err instanceof CredentialValidationError) return NextResponse.json({ error: err.message }, { status: 400 })
    if (err instanceof ConnectivityError) return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }
}
