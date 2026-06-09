import {
  normalizeCredential,
  CredentialValidationError,
  type BYODBCredentialInput,
} from '@/lib/tenant/credentials'

describe('normalizeCredential', () => {
  // -------------------------------------------------------------------------
  // Structured input — postgres
  // -------------------------------------------------------------------------
  it('structured postgres: returns params with correct engine, host, and port', () => {
    const input: BYODBCredentialInput = {
      kind: 'structured',
      params: {
        engine: 'postgres',
        host: 'db.example.com',
        port: 5432,
        database: 'app',
        user: 'u',
        password: 'p',
        ssl: true,
      },
    }
    const result = normalizeCredential(input)
    expect(result.engine).toBe('postgres')
    expect(result.host).toBe('db.example.com')
    expect(result.port).toBe(5432)
  })

  // -------------------------------------------------------------------------
  // Structured input — mysql
  // -------------------------------------------------------------------------
  it('structured mysql: returns params with correct engine and port', () => {
    const input: BYODBCredentialInput = {
      kind: 'structured',
      params: {
        engine: 'mysql',
        host: 'mysql.example.com',
        port: 3306,
        database: 'mydb',
        user: 'u',
        password: 'p',
      },
    }
    const result = normalizeCredential(input)
    expect(result.engine).toBe('mysql')
    expect(result.port).toBe(3306)
  })

  // -------------------------------------------------------------------------
  // Connection string — postgres with explicit port
  // -------------------------------------------------------------------------
  it('connection-string postgres with explicit port: parses host, port, database, user, password, engine', () => {
    const input: BYODBCredentialInput = {
      kind: 'connectionString',
      engine: 'postgres',
      connectionString: 'postgresql://user:secret@host.example:6543/mydb',
    }
    const result = normalizeCredential(input)
    expect(result.host).toBe('host.example')
    expect(result.port).toBe(6543)
    expect(result.database).toBe('mydb')
    expect(result.user).toBe('user')
    expect(result.password).toBe('secret')
    expect(result.engine).toBe('postgres')
  })

  // -------------------------------------------------------------------------
  // Connection string — postgres without port defaults to 5432
  // -------------------------------------------------------------------------
  it('connection-string postgres without port: defaults port to 5432', () => {
    const input: BYODBCredentialInput = {
      kind: 'connectionString',
      engine: 'postgres',
      connectionString: 'postgresql://user:secret@host.example/mydb',
    }
    const result = normalizeCredential(input)
    expect(result.port).toBe(5432)
  })

  // -------------------------------------------------------------------------
  // Connection string — mysql with explicit port
  // -------------------------------------------------------------------------
  it('connection-string mysql: parses port and engine', () => {
    const input: BYODBCredentialInput = {
      kind: 'connectionString',
      engine: 'mysql',
      connectionString: 'mysql://u:p@h:3307/d',
    }
    const result = normalizeCredential(input)
    expect(result.port).toBe(3307)
    expect(result.engine).toBe('mysql')
  })

  // -------------------------------------------------------------------------
  // Rejection: engine mismatch
  // -------------------------------------------------------------------------
  it('engine mismatch: throws CredentialValidationError when connection-string protocol does not match declared engine', () => {
    const input: BYODBCredentialInput = {
      kind: 'connectionString',
      engine: 'mysql',
      connectionString: 'postgresql://u:p@h/d',
    }
    expect(() => normalizeCredential(input)).toThrow(CredentialValidationError)
  })

  // -------------------------------------------------------------------------
  // Rejection: structured input missing password
  // -------------------------------------------------------------------------
  it('structured input with empty password: throws CredentialValidationError', () => {
    const input: BYODBCredentialInput = {
      kind: 'structured',
      params: {
        engine: 'postgres',
        host: 'db.example.com',
        port: 5432,
        database: 'app',
        user: 'u',
        password: '',
      },
    }
    expect(() => normalizeCredential(input)).toThrow(CredentialValidationError)
  })

  // -------------------------------------------------------------------------
  // Security: password must not appear in error messages
  // -------------------------------------------------------------------------
  it('error message does not contain the password value', () => {
    const input: BYODBCredentialInput = {
      kind: 'structured',
      params: {
        engine: 'postgres',
        host: 'db.example.com',
        port: 0, // invalid port triggers CredentialValidationError
        database: 'app',
        user: 'u',
        password: 'sup3rsecret',
      },
    }
    let caught: unknown
    try {
      normalizeCredential(input)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(CredentialValidationError)
    expect((caught as Error).message).not.toContain('sup3rsecret')
  })
})
