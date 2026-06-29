import { describe, it, expect } from 'vitest'
import {
  RetryableProvisioningError,
  ManualInterventionError,
  ReadinessError,
  classifyError,
} from '@/lib/tenant/provisioning/errors'
import { CredentialValidationError } from '@/lib/tenant/credentials'

describe('classifyError', () => {
  it('classifies RetryableProvisioningError as retryable, not manual', () => {
    expect(classifyError(new RetryableProvisioningError('db unreachable'))).toEqual({
      retryable: true,
      manual: false,
    })
  })

  it('classifies ManualInterventionError as manual, not retryable', () => {
    expect(classifyError(new ManualInterventionError('no schema ownership'))).toEqual({
      retryable: false,
      manual: true,
    })
  })

  it('classifies ReadinessError as fatal (neither retryable nor manual)', () => {
    expect(classifyError(new ReadinessError('missing config'))).toEqual({
      retryable: false,
      manual: false,
    })
  })

  it('classifies CredentialValidationError as fatal', () => {
    expect(classifyError(new CredentialValidationError('bad host'))).toEqual({
      retryable: false,
      manual: false,
    })
  })

  it('classifies an unknown Error as fatal', () => {
    expect(classifyError(new Error('boom'))).toEqual({ retryable: false, manual: false })
  })
})
