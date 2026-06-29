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

  it('classifies a thrown string as fatal', () => {
    expect(classifyError('something went wrong')).toEqual({ retryable: false, manual: false })
  })

  it('classifies null as fatal', () => {
    expect(classifyError(null)).toEqual({ retryable: false, manual: false })
  })

  it('classifies undefined as fatal', () => {
    expect(classifyError(undefined)).toEqual({ retryable: false, manual: false })
  })
})

describe('error classes', () => {
  it('RetryableProvisioningError has correct name', () => {
    expect(new RetryableProvisioningError('x').name).toBe('RetryableProvisioningError')
  })
  it('ManualInterventionError has correct name', () => {
    expect(new ManualInterventionError('x').name).toBe('ManualInterventionError')
  })
  it('ReadinessError has correct name', () => {
    expect(new ReadinessError('x').name).toBe('ReadinessError')
  })
})
