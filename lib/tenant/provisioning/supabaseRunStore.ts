import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ProvisioningRunStore,
  ProvisioningRun,
  ProvisioningRunStatus,
  ProvisioningStepName,
  StepRecordStatus,
  StepRecord,
} from '@/lib/tenant/provisioning/types'

/** Supabase-backed run store (service-role client). */
export class SupabaseProvisioningRunStore implements ProvisioningRunStore {
  constructor(private readonly client: SupabaseClient) {}

  async createRun(tenantId: string): Promise<{ runId: string }> {
    const { data, error } = await this.client
      .from('provisioning_runs')
      .insert({ tenant_id: tenantId, status: 'Running' })
      .select('id')
      .single()
    if (error || !data) throw new Error(`createRun failed: ${error?.message ?? 'no id'}`)
    return { runId: data.id as string }
  }

  async recordStep(
    runId: string,
    step: ProvisioningStepName,
    status: StepRecordStatus,
    attempts: number,
    error?: string,
  ): Promise<void> {
    const { error: upsertError } = await this.client
      .from('provisioning_run_steps')
      .upsert(
        { run_id: runId, step_name: step, status, attempts, error: error ?? null },
        { onConflict: 'run_id,step_name' },
      )
    if (upsertError) throw new Error(`recordStep failed: ${upsertError.message}`)
  }

  async setRunStatus(runId: string, status: ProvisioningRunStatus): Promise<void> {
    const { error } = await this.client
      .from('provisioning_runs')
      .update({ status })
      .eq('id', runId)
    if (error) throw new Error(`setRunStatus failed: ${error.message}`)
  }

  async getRun(runId: string): Promise<ProvisioningRun | null> {
    const { data: run, error } = await this.client
      .from('provisioning_runs')
      .select('id, tenant_id, status')
      .eq('id', runId)
      .maybeSingle()
    if (error) throw new Error(`getRun failed: ${error.message}`)
    if (!run) return null

    const { data: steps, error: stepsError } = await this.client
      .from('provisioning_run_steps')
      .select('step_name, status, attempts, error')
      .eq('run_id', runId)
    if (stepsError) throw new Error(`getRun steps failed: ${stepsError.message}`)

    return {
      runId: run.id as string,
      tenantId: run.tenant_id as string,
      status: run.status as ProvisioningRunStatus,
      steps: (steps ?? []).map(
        (s): StepRecord => ({
          name: s.step_name as ProvisioningStepName,
          status: s.status as StepRecordStatus,
          attempts: s.attempts as number,
          error: (s.error as string | null) ?? undefined,
        }),
      ),
    }
  }

  async getLatestRunForTenant(tenantId: string): Promise<ProvisioningRun | null> {
    const { data, error } = await this.client
      .from('provisioning_runs')
      .select('id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`getLatestRunForTenant failed: ${error.message}`)
    if (!data) return null
    return this.getRun(data.id as string)
  }
}
