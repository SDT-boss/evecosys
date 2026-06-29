import type { Tenant, TenantState } from '@/lib/tenant/types'
import type { BYODBCredentialInput } from '@/lib/tenant/credentials'

export type ProvisioningStepName =
  | 'bind_byodb'
  | 'seed_config'
  | 'bootstrap_feature_flags'
  | 'bootstrap_metering'
  | 'readiness_gate'
  | 'activate'

export type ProvisioningRunStatus =
  | 'Running'
  | 'Provisioned'
  | 'RolledBack'
  | 'AwaitingManualIntervention'

export type StepRecordStatus = 'Running' | 'Completed' | 'Failed' | 'Compensated'

/**
 * Mutable state passed to every step. Steps read `tenant`/`byodbInput` and may
 * write `secretId` (bind_byodb sets it; compensate/readiness read it).
 * Credentials live only inside `byodbInput`; never log this object.
 */
export interface ProvisioningContext {
  readonly tenant: Tenant
  readonly byodbInput: BYODBCredentialInput
  secretId?: string
}

/**
 * A single provisioning step. `run` throws on failure (the orchestrator classifies
 * the error). `compensate` undoes a previously-completed step and MUST be idempotent.
 */
export interface ProvisioningStep {
  readonly name: ProvisioningStepName
  readonly maxAttempts: number
  run(ctx: ProvisioningContext): Promise<void>
  compensate(ctx: ProvisioningContext): Promise<void>
}

/**
 * Data-access surface for steps that touch Postgres (everything except probe/vault).
 * Keeps Supabase specifics out of step logic so steps are unit-testable with a fake.
 */
export interface ProvisioningDb {
  seedConfig(tenantId: string, settings: Record<string, string>): Promise<void>
  deleteConfig(tenantId: string): Promise<void>
  setFeatureFlags(tenantId: string, flags: Record<string, boolean>): Promise<void>
  initMetering(tenantId: string, quotaBytes: number): Promise<void>
  deleteMetering(tenantId: string): Promise<void>
  setTenantState(tenantId: string, state: TenantState): Promise<void>
  hasConfig(tenantId: string): Promise<boolean>
  hasMetering(tenantId: string): Promise<boolean>
  getFeatureFlags(tenantId: string): Promise<Record<string, boolean> | null>
}

export interface StepRecord {
  name: ProvisioningStepName
  status: StepRecordStatus
  attempts: number
  error?: string
}

export interface ProvisioningRun {
  runId: string
  tenantId: string
  status: ProvisioningRunStatus
  steps: StepRecord[]
}

/**
 * Persistence for run + per-step progress. The orchestrator depends on this
 * interface only, so it can be unit-tested with an in-memory fake.
 */
export interface ProvisioningRunStore {
  createRun(tenantId: string): Promise<{ runId: string }>
  recordStep(
    runId: string,
    step: ProvisioningStepName,
    status: StepRecordStatus,
    attempts: number,
    error?: string,
  ): Promise<void>
  setRunStatus(runId: string, status: ProvisioningRunStatus): Promise<void>
  getRun(runId: string): Promise<ProvisioningRun | null>
  getLatestRunForTenant(tenantId: string): Promise<ProvisioningRun | null>
}
