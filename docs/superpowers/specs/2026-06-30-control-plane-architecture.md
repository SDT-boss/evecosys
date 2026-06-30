# Control-Plane & Tenant Provisioning Architecture (EVE-37)

## Responsibilities & boundaries
The control plane owns tenant lifecycle state and the metadata downstream systems
depend on. It does NOT run tenant workloads or provision infrastructure (EVE-46).

| Concern | Owner | Module |
|---|---|---|
| Tenant lifecycle state | Control plane | `lib/tenant/stateMachine.ts`, `lib/tenant/controlplane/lifecycleService.ts` |
| Provisioning (register→activate) | Control plane | `lib/tenant/provisioning/` (EVE-45) |
| BYODB credentials | Control plane (Vault) | `lib/tenant/vault*.ts`, `controlplane/credentialRotation.ts` |
| Config distribution to downstream | Control plane | `controlplane/configResolver.ts` |
| Deployment / environments | Deployment orchestrator | EVE-46 (out of scope) |
| Durable audit log | Audit subsystem | EVE-55 (out of scope; seam here) |

## Tenant lifecycle
States: `Registered → Provisioning → Active → Suspended → Decommissioned`.
- Provisioning (EVE-45): `Registered → Provisioning → Active` with rollback.
- Suspend: `Active → Suspended` (tenant becomes non-routable; data retained).
- Reactivate: `Suspended → Active`.
- Decommission: `Active|Suspended → Decommissioned` (terminal; BYODB secret deleted).
- Override (privileged): platform-admin forces a target state with a required
  `reason`, audited. Used to recover stuck tenants. Cannot resurrect a
  `Decommissioned` tenant (terminal).
Only `Active` is **routable** (`isRoutable`). Suspended/Decommissioned/Provisioning
are non-routable.

## BYODB credential management
Credentials are validated (parse + connectivity probe with schema-ownership check)
before storage, stored only in Supabase Vault (never a plaintext column or log), and
referenced by `tenants.vault_secret_id`. Rotation validates the new credential before
swapping the reference and deletes the old secret; failure rolls back to the old
secret. Decommission deletes the secret.

## Downstream dependencies on control-plane state
Routing, feature flagging, storage metering, and cross-platform clients read a
tenant-scoped `ControlPlaneSnapshot` (`{ status, routable, featureFlags, config,
metering }`) only with a **validated tenant context** (platform-admin, or the tenant
owner for their own tenant). No caller can read another tenant's control-plane state
(enforced by route guard + RLS).

## Security, audit, rollback
- Every lifecycle/rotation/override action validates tenant identity + role before
  mutating, runs through the service-role client, and emits a `ControlPlaneAuditEvent`
  (no credentials in events). Durable persistence is EVE-55.
- Rollback: provisioning (EVE-45) and rotation both restore prior state on failure;
  a failed action never leaves a tenant `Active` (routable) when it should not be.

## Out of scope (dependencies)
EVE-46 deployment orchestration; EVE-55 durable audit log; runtime BYODB query
execution (no consumer reads the stored secret yet).
