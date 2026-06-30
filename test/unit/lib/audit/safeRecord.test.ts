import { describe, it, expect, vi } from 'vitest'
import { safeRecord } from '@/lib/audit/safeRecord'
import type { AuditRecorder } from '@/lib/audit/types'

const INPUT = {
  tenantId: 't1',
  actor: { id: 'i', label: 'board@x.com', role: 'board' },
  action: 'config.feature_flags' as const,
  outcome: 'ok' as const,
}

describe('safeRecord', () => {
  it('forwards the input to the recorder', async () => {
    const record = vi.fn().mockResolvedValue(undefined)
    await safeRecord({ record } as AuditRecorder, INPUT)
    expect(record).toHaveBeenCalledWith(INPUT)
  })

  it('never throws when the recorder fails', async () => {
    const record = vi.fn().mockRejectedValue(new Error('db down'))
    await expect(safeRecord({ record } as AuditRecorder, INPUT)).resolves.toBeUndefined()
  })
})
