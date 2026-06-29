import type { ProvisioningStepName } from '@/lib/tenant/provisioning/types'

/**
 * Canonical V1 feature-flag set. Must match the DEFAULT in
 * supabase/migrations/20260620130000_add_tenant_feature_flags.sql.
 */
export const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
  member_invitations: true,
  fleet: true,
  carbon: true,
  trips: true,
  driver_behaviour_score: true,
  alerts: true,
  charging_stations: true,
  auth_troubleshooting: true,
}

/** Default config seeded into tenant_config.settings during provisioning. */
export const DEFAULT_TENANT_CONFIG: Record<string, string> = {
  locale: 'en-MY',
  timezone: 'Asia/Kuala_Lumpur',
  distance_unit: 'km',
}

/** Default storage quota for a newly provisioned tenant: 5 GiB. */
export const DEFAULT_QUOTA_BYTES = 5 * 1024 * 1024 * 1024

/** Canonical execution order of provisioning steps. */
export const PROVISIONING_STEP_ORDER: readonly ProvisioningStepName[] = [
  'bind_byodb',
  'seed_config',
  'bootstrap_feature_flags',
  'bootstrap_metering',
  'readiness_gate',
  'activate',
] as const
