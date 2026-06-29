import { describe, it, expect, vi } from 'vitest'
import { ProvisioningOrchestrator } from '@/lib/tenant/provisioning/orchestrator'
import { RetryableProvisioningError, ManualInterventionError } from '@/lib/tenant/provisioning/errors'
import type {
  ProvisioningStep,
  ProvisioningRunStore,
  ProvisioningContext,
  ProvisioningRun,
  ProvisioningStepName,
  StepRecordStatus,
} from '@/lib/tenant/provisioning/types'
import type { Tenant } from '@/lib/tenant/types'

const TENANT: Tenant = {
  id: 'tenant-1', owner_id: 'o', name: 'T', state: 'Provisioning',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}
function ctx(): ProvisioningContext {
  return { tenant: TENANT, byodbInput: { kind: 'structured', params: { engine: 'postgres', host: 'h', port: 5432, database: 'd', user: 'u', password: 'p' } } }
}

/** In-memory run store that records the final status and step records. */
function memStore() {
  const recorded: { step: ProvisioningStepName; status: StepRecordStatus; attempts: number }[] = []
  let runStatus: ProvisioningRun['status'] = 'Running'
  const store: ProvisioningRunStore = {
    createRun: vi.fn().mockResolvedValue({ runId: 'run-1' }),
    recordStep: vi.fn().mockImplementation(async (_r, step, status, attempts) => {
      recorded.push({ step, status, attempts })
    }),
    setRunStatus: vi.fn().mockImplementation(async (_r, s) => { runStatus = s }),
    getRun: vi.fn().mockImplementation(async () => ({
      runId: 'run-1', tenantId: 'tenant-1', status: runStatus,
      steps: recorded.filter(r => r.status === 'Completed' || r.status === 'Failed').map(r => ({ name: r.step, status: r.status, attempts: r.attempts })),
    })),
    getLatestRunForTenant: vi.fn(),
  }
  return { store, recorded, getStatus: () => runStatus }
}

/** Configurable fake step recording run/compensate calls. */
function fakeStep(
  name: ProvisioningStepName,
  behavior: { fail?: () => Error; failTimes?: number; maxAttempts?: number },
  log: string[],
): ProvisioningStep {
  let calls = 0
  return {
    name,
    maxAttempts: behavior.maxAttempts ?? 3,
    async run() {
      calls++
      log.push(`run:${name}:${calls}`)
      if (behavior.fail && calls <= (behavior.failTimes ?? Infinity)) throw behavior.fail()
    },
    async compensate() { log.push(`compensate:${name}`) },
  }
}

describe('ProvisioningOrchestrator', () => {
  it('runs all steps in order and ends Provisioned', async () => {
    const log: string[] = []
    const { store, getStatus } = memStore()
    const steps = [fakeStep('seed_config', {}, log), fakeStep('activate', {}, log)]
    const orch = new ProvisioningOrchestrator(steps, store)

    const run = await orch.provision(ctx())

    expect(log).toEqual(['run:seed_config:1', 'run:activate:1'])
    expect(getStatus()).toBe('Provisioned')
    expect(run.status).toBe('Provisioned')
  })

  it('retries a retryable failure then succeeds', async () => {
    const log: string[] = []
    const { store, recorded } = memStore()
    const steps = [fakeStep('seed_config', { fail: () => new RetryableProvisioningError('x'), failTimes: 1, maxAttempts: 3 }, log)]
    const orch = new ProvisioningOrchestrator(steps, store)

    await orch.provision(ctx())

    expect(log).toEqual(['run:seed_config:1', 'run:seed_config:2'])
    const completed = recorded.find(r => r.step === 'seed_config' && r.status === 'Completed')
    expect(completed?.attempts).toBe(2)
  })

  it('rolls back completed steps in reverse on a fatal failure', async () => {
    const log: string[] = []
    const { store, getStatus } = memStore()
    const steps = [
      fakeStep('seed_config', {}, log),
      fakeStep('bootstrap_metering', {}, log),
      fakeStep('activate', { fail: () => new Error('boom'), maxAttempts: 1 }, log),
    ]
    const orch = new ProvisioningOrchestrator(steps, store)

    const run = await orch.provision(ctx())

    expect(log).toEqual([
      'run:seed_config:1', 'run:bootstrap_metering:1', 'run:activate:1',
      'compensate:bootstrap_metering', 'compensate:seed_config',
    ])
    expect(getStatus()).toBe('RolledBack')
    expect(run.status).toBe('RolledBack')
  })

  it('rolls back when a retryable failure exhausts maxAttempts', async () => {
    const log: string[] = []
    const { store, getStatus } = memStore()
    const steps = [
      fakeStep('seed_config', {}, log),
      fakeStep('bootstrap_metering', { fail: () => new RetryableProvisioningError('x'), maxAttempts: 2 }, log),
    ]
    const orch = new ProvisioningOrchestrator(steps, store)

    await orch.provision(ctx())

    expect(log).toEqual([
      'run:seed_config:1', 'run:bootstrap_metering:1', 'run:bootstrap_metering:2',
      'compensate:seed_config',
    ])
    expect(getStatus()).toBe('RolledBack')
  })

  it('halts at AwaitingManualIntervention WITHOUT rolling back', async () => {
    const log: string[] = []
    const { store, getStatus } = memStore()
    const steps = [
      fakeStep('seed_config', {}, log),
      fakeStep('bind_byodb', { fail: () => new ManualInterventionError('grant access'), maxAttempts: 1 }, log),
      fakeStep('activate', {}, log),
    ]
    const orch = new ProvisioningOrchestrator(steps, store)

    const run = await orch.provision(ctx())

    expect(log).toEqual(['run:seed_config:1', 'run:bind_byodb:1'])
    expect(log).not.toContain('compensate:seed_config')
    expect(getStatus()).toBe('AwaitingManualIntervention')
    expect(run.status).toBe('AwaitingManualIntervention')
  })
})
