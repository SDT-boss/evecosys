import type {
  ProvisioningStep,
  ProvisioningContext,
  ProvisioningRun,
  ProvisioningRunStore,
} from '@/lib/tenant/provisioning/types'
import { classifyError } from '@/lib/tenant/provisioning/errors'
import { type AuditSink, noopAuditSink } from '@/lib/tenant/provisioning/audit'

function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Runs provisioning steps in order with per-step retry, manual-intervention halt,
 * and reverse-order rollback. `activate` must be the last step so any earlier
 * failure leaves the tenant non-routable.
 */
export class ProvisioningOrchestrator {
  constructor(
    private readonly steps: ProvisioningStep[],
    private readonly runStore: ProvisioningRunStore,
    private readonly audit: AuditSink = noopAuditSink,
  ) {}

  async provision(ctx: ProvisioningContext): Promise<ProvisioningRun> {
    const tenantId = ctx.tenant.id
    const { runId } = await this.runStore.createRun(tenantId)
    await this.audit.record({ tenantId, runId, action: 'run.start', outcome: 'ok', at: nowIso() })

    const completed: ProvisioningStep[] = []

    for (const step of this.steps) {
      let attempts = 0
      // attempt loop
      while (true) {
        attempts++
        await this.runStore.recordStep(runId, step.name, 'Running', attempts)
        try {
          await step.run(ctx)
          await this.runStore.recordStep(runId, step.name, 'Completed', attempts)
          await this.audit.record({ tenantId, runId, step: step.name, action: 'step.complete', outcome: 'ok', at: nowIso() })
          completed.push(step)
          break
        } catch (err) {
          const { retryable, manual } = classifyError(err)
          const message = err instanceof Error ? err.message : String(err)

          if (retryable && attempts < step.maxAttempts) {
            await this.audit.record({ tenantId, runId, step: step.name, action: 'step.retry', outcome: 'error', error: message, at: nowIso() })
            continue
          }

          await this.runStore.recordStep(runId, step.name, 'Failed', attempts, message)
          await this.audit.record({ tenantId, runId, step: step.name, action: 'step.fail', outcome: 'error', error: message, at: nowIso() })

          if (manual) {
            await this.runStore.setRunStatus(runId, 'AwaitingManualIntervention')
            await this.audit.record({ tenantId, runId, step: step.name, action: 'run.manual', outcome: 'error', error: message, at: nowIso() })
            return this.finalRun(runId, tenantId)
          }

          await this.rollback(completed, ctx, runId)
          await this.runStore.setRunStatus(runId, 'RolledBack')
          await this.audit.record({ tenantId, runId, step: step.name, action: 'run.rollback', outcome: 'error', error: message, at: nowIso() })
          return this.finalRun(runId, tenantId)
        }
      }
    }

    await this.runStore.setRunStatus(runId, 'Provisioned')
    await this.audit.record({ tenantId, runId, action: 'run.complete', outcome: 'ok', at: nowIso() })
    return this.finalRun(runId, tenantId)
  }

  private async rollback(completed: ProvisioningStep[], ctx: ProvisioningContext, runId: string): Promise<void> {
    for (const step of [...completed].reverse()) {
      try {
        await step.compensate(ctx)
        await this.runStore.recordStep(runId, step.name, 'Compensated', 0)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        await this.audit.record({
          tenantId: ctx.tenant.id, runId, step: step.name,
          action: 'compensate.fail', outcome: 'error', error: message, at: nowIso(),
        })
      }
    }
  }

  private async finalRun(runId: string, tenantId: string): Promise<ProvisioningRun> {
    const run = await this.runStore.getRun(runId)
    return run ?? { runId, tenantId, status: 'RolledBack', steps: [] }
  }
}
