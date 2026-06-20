'use client'

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Badge,
  EmptyState,
} from '@evecosys/design-system'
import { setActiveTenant } from '@/app/(dashboard)/platform/actions'
import { statusBadgeVariant } from '@/lib/platform/tenantStatus'

interface TenantRow {
  id: string
  name: string
  status: 'Active' | 'Pending' | 'Suspended'
}

interface TenantListProps {
  tenants: TenantRow[]
  activeTenantId?: string | null
  error?: string
}

export function TenantList({ tenants, activeTenantId, error }: TenantListProps) {
  if (error) {
    return (
      <EmptyState
        title="Could not load tenants"
        description="There was a problem fetching the tenant list. Refresh the page to try again."
      />
    )
  }

  if (tenants.length === 0) {
    return (
      <EmptyState
        title="No tenants found"
        description="No tenants have been registered yet. New tenants will appear here once provisioning begins."
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tenant</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tenants.map((tenant) => (
          <TableRow
            key={tenant.id}
            role="button"
            tabIndex={0}
            aria-label={`Set ${tenant.name} as active workspace`}
            className="cursor-pointer"
            data-state={activeTenantId === tenant.id ? 'selected' : undefined}
            onClick={() => setActiveTenant(tenant.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTenant(tenant.id)
            }}
          >
            <TableCell>{tenant.name}</TableCell>
            <TableCell>
              <Badge variant={statusBadgeVariant(tenant.status)}>
                {tenant.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
