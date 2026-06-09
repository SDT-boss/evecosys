import type { DbConnectionParams } from '@/lib/tenant/credentials'

export interface ProbeResult {
  reachable: boolean
  ownsSchema: boolean
  error?: string
}

export interface ConnectivityProbe {
  probe(params: DbConnectionParams): Promise<ProbeResult>
}

export class ConnectivityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConnectivityError'
  }
}
