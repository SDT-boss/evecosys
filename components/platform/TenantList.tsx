'use client'

import { useTransition, useState } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Badge,
  EmptyState,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@evecosys/design-system'
import { setActiveTenant } from '@/app/(dashboard)/platform/actions'
import { statusBadgeVariant } from '@/lib/platform/tenantStatus'
import { useTenantContext } from '@/components/platform/TenantContext'

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

export function TenantList({ tenants, activeTenantId: initialActiveTenantId, error }: TenantListProps) {
  const [isPending, startTransition] = useTransition()
  const [pendingTenantId, setPendingTenantId] = useState<string | null>(null)
  const [activeTenantId, setActiveTenantId] = useState(initialActiveTenantId ?? null)
  const [switchError, setSwitchError] = useState<string | null>(null)
  const { setActiveTenantName } = useTenantContext()

  function handleRowClick(tenant: TenantRow) {
    const previousId = activeTenantId
    setActiveTenantId(tenant.id)
    setActiveTenantName(tenant.name)
    setSwitchError(null)
    setPendingTenantId(tenant.id)

    startTransition(async () => {
      const result = await setActiveTenant(tenant.id)
      if (!result.ok) {
        setActiveTenantId(previousId)
        setActiveTenantName(tenants.find((t) => t.id === previousId)?.name ?? null)
        setSwitchError(
          result.error
            ? `Failed to switch workspace. Please try again. (${result.error})`
            : 'Failed to switch workspace. Please try again.'
        )
      }
      setPendingTenantId(null)
    })
  }

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
    <>
      {switchError && (
        <Alert variant="destructive" className="mb-[var(--ds-space-sm)]" style={{ position: 'relative' }}>
          <AlertTitle>Switch failed</AlertTitle>
          <AlertDescription>{switchError}</AlertDescription>
          <button
            aria-label="Dismiss error"
            className="absolute text-[var(--ds-color-status-error)] hover:opacity-70"
            style={{ right: 'var(--ds-space-md)', top: 'var(--ds-space-md)' }}
            onClick={() => setSwitchError(null)}
          >
            ×
          </button>
        </Alert>
      )}
      <Table
        aria-busy={isPending}
        style={{ cursor: isPending ? 'not-allowed' : undefined }}
      >
        <TableHeader>
          <TableRow>
            <TableHead>Tenant</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody style={{ opacity: isPending ? 0.5 : 1 }}>
          {tenants.map((tenant) => (
            <TableRow
              key={tenant.id}
              role="button"
              tabIndex={0}
              aria-label={`Set ${tenant.name} as active workspace`}
              className="cursor-pointer"
              data-state={activeTenantId === tenant.id ? 'selected' : undefined}
              aria-disabled={isPending && pendingTenantId !== tenant.id ? 'true' : undefined}
              style={{ pointerEvents: isPending ? 'none' : undefined }}
              onClick={() => handleRowClick(tenant)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleRowClick(tenant)
              }}
            >
              <TableCell>
                {pendingTenantId === tenant.id ? (
                  <span className="flex items-center gap-[var(--ds-space-xs)]">
                    <Spinner size="sm" aria-hidden="true" />
                    <span className="sr-only">Switching to {tenant.name}…</span>
                  </span>
                ) : (
                  tenant.name
                )}
              </TableCell>
              <TableCell>
                <Badge variant={statusBadgeVariant(tenant.status)}>
                  {tenant.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
