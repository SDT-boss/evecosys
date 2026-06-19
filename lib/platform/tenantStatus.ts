import type { TenantState } from '@/lib/tenant/types'

export type DisplayStatus = 'Active' | 'Pending' | 'Suspended'

/**
 * Maps a TenantState to a DisplayStatus for the Platform Admin UI.
 * Returns null for Decommissioned — those tenants are filtered from the list (D-05).
 */
export function mapTenantState(state: TenantState): DisplayStatus | null {
  switch (state) {
    case 'Active':          return 'Active'
    case 'Registered':      return 'Pending'
    case 'Provisioning':    return 'Pending'
    case 'Suspended':       return 'Suspended'
    case 'Decommissioned':  return null  // filtered out per UI-SPEC decision
  }
}

/**
 * Maps a DisplayStatus to the Badge variant used in the tenant list table.
 * Active → default (green), Pending → secondary (grey), Suspended → destructive (red).
 */
export function statusBadgeVariant(status: DisplayStatus): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'Active':    return 'default'
    case 'Pending':   return 'secondary'
    case 'Suspended': return 'destructive'
  }
}
