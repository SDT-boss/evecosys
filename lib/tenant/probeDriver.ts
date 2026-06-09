import type { ConnectivityProbe, ProbeResult } from '@/lib/tenant/probe'
import type { DbConnectionParams } from '@/lib/tenant/credentials'

/**
 * RealConnectivityProbe
 *
 * Concrete implementation of ConnectivityProbe using the `pg` (Node.js PostgreSQL
 * driver) and `mysql2` libraries.  Both drivers are loaded via dynamic import so
 * the test suite, which injects fake probes, never requires them to be present.
 *
 * Timeout: 5 s per engine.
 * Ownership check:
 *   - postgres: has_database_privilege(current_user, current_database(), 'CREATE')
 *   - mysql:    SHOW GRANTS FOR CURRENT_USER() — any row containing CREATE or ALL PRIVILEGES
 *
 * Passwords are NEVER included in returned error messages.
 */
export class RealConnectivityProbe implements ConnectivityProbe {
  async probe(params: DbConnectionParams): Promise<ProbeResult> {
    if (params.engine === 'postgres') {
      return this._probePostgres(params)
    }
    return this._probeMysql(params)
  }

  private async _probePostgres(params: DbConnectionParams): Promise<ProbeResult> {
    // Dynamic import keeps pg out of the module graph for test environments.
    const { Client } = await import('pg')

    const client = new Client({
      host: params.host,
      port: params.port,
      database: params.database,
      user: params.user,
      password: params.password,
      ssl: params.ssl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 5000,
    })

    try {
      await client.connect()

      // Reachability check — succeeds if the connection itself was made
      await client.query('SELECT 1')

      // Ownership check — can the current user create objects in the current database?
      const ownershipResult = await client.query(
        "SELECT has_database_privilege(current_user, current_database(), 'CREATE') AS owns",
      )
      const ownsSchema = ownershipResult.rows[0]?.owns === true

      return { reachable: true, ownsSchema }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { reachable: false, ownsSchema: false, error: message }
    } finally {
      await client.end().catch(() => undefined)
    }
  }

  private async _probeMysql(params: DbConnectionParams): Promise<ProbeResult> {
    // Dynamic import keeps mysql2 out of the module graph for test environments.
    const mysql = await import('mysql2/promise')

    const conn = await mysql
      .createConnection({
        host: params.host,
        port: params.port,
        database: params.database,
        user: params.user,
        password: params.password,
        connectTimeout: 5000,
        ssl: params.ssl ? {} : undefined,
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        throw Object.assign(new Error(message), { __connectFailed: true })
      })

    try {
      // Reachability check
      await conn.query('SELECT 1')

      // Ownership check — look for CREATE or ALL PRIVILEGES in the grants
      const [rows] = await conn.query('SHOW GRANTS FOR CURRENT_USER()')
      const grantsText = JSON.stringify(rows)
      const ownsSchema = /CREATE|ALL PRIVILEGES/i.test(grantsText)

      return { reachable: true, ownsSchema }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { reachable: false, ownsSchema: false, error: message }
    } finally {
      await conn.end().catch(() => undefined)
    }
  }
}
