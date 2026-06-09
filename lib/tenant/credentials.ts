export const BYODB_ENGINES = ['postgres', 'mysql'] as const
export type BYODBEngine = (typeof BYODB_ENGINES)[number]

export interface DbConnectionParams {
  engine: BYODBEngine
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean
}

export interface ConnectionStringInput {
  kind: 'connectionString'
  engine: BYODBEngine
  connectionString: string
}

export interface StructuredInput {
  kind: 'structured'
  params: DbConnectionParams
}

export type BYODBCredentialInput = ConnectionStringInput | StructuredInput

export class CredentialValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CredentialValidationError'
  }
}

const DEFAULT_PORTS: Record<BYODBEngine, number> = {
  postgres: 5432,
  mysql: 3306,
}

const PROTOCOL_ENGINE_MAP: Record<string, BYODBEngine> = {
  postgres: 'postgres',
  postgresql: 'postgres',
  mysql: 'mysql',
}

export function normalizeCredential(input: BYODBCredentialInput): DbConnectionParams {
  if (input.kind === 'structured') {
    const { params } = input

    if (!BYODB_ENGINES.includes(params.engine)) {
      throw new CredentialValidationError(`Unsupported engine: ${params.engine}`)
    }
    if (!params.host || params.host.trim() === '') {
      throw new CredentialValidationError('Missing required field: host')
    }
    if (!params.database || params.database.trim() === '') {
      throw new CredentialValidationError('Missing required field: database')
    }
    if (!params.user || params.user.trim() === '') {
      throw new CredentialValidationError('Missing required field: user')
    }
    if (!params.password || params.password.trim() === '') {
      throw new CredentialValidationError('Missing required field: password')
    }
    if (!Number.isInteger(params.port) || params.port <= 0) {
      throw new CredentialValidationError('Invalid port: must be a positive integer')
    }

    return { ...params }
  }

  // kind === 'connectionString'
  let url: URL
  try {
    url = new URL(input.connectionString)
  } catch {
    throw new CredentialValidationError('Invalid connection string: could not be parsed as a URL')
  }

  const protocol = url.protocol.replace(/:$/, '')
  const mappedEngine = PROTOCOL_ENGINE_MAP[protocol]

  if (!mappedEngine) {
    throw new CredentialValidationError(`Unsupported connection string protocol: ${protocol}`)
  }
  if (mappedEngine !== input.engine) {
    throw new CredentialValidationError(
      `Connection string protocol '${protocol}' does not match declared engine '${input.engine}'`,
    )
  }

  const host = url.hostname
  if (!host) {
    throw new CredentialValidationError('Missing required field: host')
  }

  const portStr = url.port
  const port = portStr ? Number(portStr) : DEFAULT_PORTS[mappedEngine]
  if (!Number.isInteger(port) || port <= 0) {
    throw new CredentialValidationError('Invalid port in connection string: must be a positive integer')
  }

  const database = url.pathname.replace(/^\//, '')
  if (!database) {
    throw new CredentialValidationError('Missing required field: database (path component of URL)')
  }

  const user = decodeURIComponent(url.username)
  if (!user) {
    throw new CredentialValidationError('Missing required field: user')
  }

  const password = decodeURIComponent(url.password)
  if (!password) {
    throw new CredentialValidationError('Missing required field: password')
  }

  return {
    engine: mappedEngine,
    host,
    port,
    database,
    user,
    password,
  }
}
