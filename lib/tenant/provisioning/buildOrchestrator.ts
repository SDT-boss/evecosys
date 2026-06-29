import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ProvisioningOrchestrator } from '@/lib/tenant/provisioning/orchestrator'
import { SupabaseProvisioningDb } from '@/lib/tenant/provisioning/supabaseProvisioningDb'
import { SupabaseProvisioningRunStore } from '@/lib/tenant/provisioning/supabaseRunStore'
import { createBindByodbStep } from '@/lib/tenant/provisioning/steps/bindByodb'
import { createSeedConfigStep } from '@/lib/tenant/provisioning/steps/seedConfig'
import { createBootstrapFeatureFlagsStep } from '@/lib/tenant/provisioning/steps/bootstrapFeatureFlags'
import { createBootstrapMeteringStep } from '@/lib/tenant/provisioning/steps/bootstrapMetering'
import { createReadinessGateStep } from '@/lib/tenant/provisioning/steps/readinessGate'
import { createActivateStep } from '@/lib/tenant/provisioning/steps/activate'
import { RealConnectivityProbe } from '@/lib/tenant/probeDriver'
import { SupabaseVaultStore } from '@/lib/tenant/vaultStore'
import { noopAuditSink, type AuditSink } from '@/lib/tenant/provisioning/audit'

/**
 * Wires the full provisioning step list + Supabase-backed store/db into a
 * ready-to-run orchestrator. `admin` MUST be a service-role client.
 * EVE-55 will pass a real AuditSink here in place of the no-op default.
 */
export function buildOrchestrator(admin: SupabaseClient, audit: AuditSink = noopAuditSink): ProvisioningOrchestrator {
  const db = new SupabaseProvisioningDb(admin)
  const store = new SupabaseProvisioningRunStore(admin)

  const steps = [
    createBindByodbStep(new RealConnectivityProbe(), new SupabaseVaultStore(admin)),
    createSeedConfigStep(db),
    createBootstrapFeatureFlagsStep(db),
    createBootstrapMeteringStep(db),
    createReadinessGateStep(db),
    createActivateStep(db),
  ]

  return new ProvisioningOrchestrator(steps, store, audit)
}
