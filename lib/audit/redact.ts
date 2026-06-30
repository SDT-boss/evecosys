/** Placeholder written in place of any value whose key looks sensitive. */
export const REDACTED = '[REDACTED]'

/**
 * Substrings (case-insensitive) that mark a key as sensitive. Defense-in-depth:
 * callers should never pass secret VALUES, but if they do, the value is masked.
 */
const SENSITIVE_KEY_PATTERNS = [
  'password',
  'secret',
  'token',
  'credential',
  'apikey',
  'api_key',
  'key', // matches 'key', 'privateKey', 'serviceRoleKey'
  'connectionstring',
  'connection_string',
  'auth',
  'pwd',
]

function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[_-]/g, '')
  return SENSITIVE_KEY_PATTERNS.some((p) => k.includes(p.replace(/[_-]/g, '')))
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isSensitiveKey(k) ? REDACTED : redactValue(v)
    }
    return out
  }
  return value
}

/**
 * Returns a deep copy of `details` with any sensitive-looking key's value
 * replaced by REDACTED. Never mutates the input.
 */
export function redactSensitive(
  details: Record<string, unknown>,
): Record<string, unknown> {
  return redactValue(details) as Record<string, unknown>
}
