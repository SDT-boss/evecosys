import { describe, it, expect } from 'vitest'
import { redactSensitive, REDACTED } from '@/lib/audit/redact'

describe('redactSensitive', () => {
  it('masks top-level sensitive keys by name (case-insensitive, substring)', () => {
    const out = redactSensitive({
      password: 'hunter2',
      Secret: 'abc',
      apiToken: 'xyz',
      connectionString: 'postgres://u:p@h/db',
      host: 'db.example.com',
    })
    expect(out).toEqual({
      password: REDACTED,
      Secret: REDACTED,
      apiToken: REDACTED,
      connectionString: REDACTED,
      host: 'db.example.com',
    })
  })

  it('masks nested sensitive keys recursively, incl. arrays of objects', () => {
    const out = redactSensitive({
      params: { user: 'alice', password: 'p', engine: 'postgres' },
      creds: [{ key: 'k', label: 'ok' }],
    })
    expect(out).toEqual({
      params: { user: 'alice', password: REDACTED, engine: 'postgres' },
      creds: [{ key: REDACTED, label: 'ok' }],
    })
  })

  it('leaves non-sensitive primitive values untouched and does not mutate input', () => {
    const input = { count: 3, enabled: true, name: 'Acme' }
    const out = redactSensitive(input)
    expect(out).toEqual({ count: 3, enabled: true, name: 'Acme' })
    expect(input).toEqual({ count: 3, enabled: true, name: 'Acme' }) // unchanged
  })
})
