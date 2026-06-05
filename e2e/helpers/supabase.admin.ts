/**
 * Direct Supabase admin operations for E2E test setup and teardown.
 * Uses the service role key — never runs in the browser.
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
}

export const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export interface TestUser {
  id: string
  email: string
  role: 'manager' | 'driver' | 'board'
}

export interface TestVehicle {
  id: string
  plate_no: string
  brand: string
  model: string
}

export interface TestAlert {
  id: string
  vehicle_id: string
  type: string
  message: string
}

export interface TestChargingStation {
  id: string
  name: string
}

/**
 * Creates a Supabase Auth user and a matching public.users profile row.
 * Sets force_password_reset_at 30 days from now (not expired).
 */
export async function createTestUser(params: {
  email: string
  password: string
  full_name: string
  role: 'manager' | 'driver' | 'board'
}): Promise<TestUser> {
  const { data, error } = await adminClient.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: { full_name: params.full_name, role: params.role },
  })
  if (error) throw new Error(`createTestUser failed: ${error.message}`)

  const nextReset = new Date()
  nextReset.setDate(nextReset.getDate() + 30)

  await adminClient.from('users').upsert({
    id: data.user.id,
    email: params.email,
    full_name: params.full_name,
    role: params.role,
    force_password_reset_at: nextReset.toISOString(),
  })

  if (params.role === 'driver') {
    await adminClient.from('drivers').insert({ user_id: data.user.id })
  }

  return { id: data.user.id, email: params.email, role: params.role }
}

/** Deletes a user from Supabase Auth and cascades to public.users (via FK or manual delete). */
export async function deleteTestUser(userId: string): Promise<void> {
  await adminClient.from('users').delete().eq('id', userId)
  await adminClient.auth.admin.deleteUser(userId)
}

/** Creates a test vehicle and returns its ID. */
export async function createTestVehicle(overrides: Partial<{
  brand: string; model: string; plate_no: string; soc: number; soh: number; status: string
}> = {}): Promise<TestVehicle> {
  const payload = {
    brand: overrides.brand ?? 'BYD',
    model: overrides.model ?? 'Atto 3',
    plate_no: overrides.plate_no ?? `TEST-${Date.now()}`,
    soc: overrides.soc ?? 75,
    soh: overrides.soh ?? 88,
    status: overrides.status ?? 'Parked',
    location_name: 'Test Location',
    location_detail: 'Test Detail',
    coordinates: '3.140853,101.686855',
    odometer: 15000,
    year: 2023,
    created_at: new Date().toISOString(),
  }
  const { data, error } = await adminClient.from('vehicles').insert(payload).select().single()
  if (error) throw new Error(`createTestVehicle failed: ${error.message}`)
  return { id: data.id, plate_no: data.plate_no, brand: data.brand, model: data.model }
}

export async function deleteTestVehicle(vehicleId: string): Promise<void> {
  await adminClient.from('trips').delete().eq('vehicle_id', vehicleId)
  await adminClient.from('alerts').delete().eq('vehicle_id', vehicleId)
  await adminClient.from('drivers').update({ assigned_vehicle_id: null }).eq('assigned_vehicle_id', vehicleId)
  await adminClient.from('vehicles').delete().eq('id', vehicleId)
}

/** Creates an unresolved alert for a vehicle. */
export async function createTestAlert(vehicleId: string, overrides: Partial<{
  type: string; message: string; resolved: boolean
}> = {}): Promise<TestAlert> {
  const payload = {
    vehicle_id: vehicleId,
    type: overrides.type ?? 'low_battery',
    message: overrides.message ?? 'Battery below 20%',
    resolved: overrides.resolved ?? false,
    created_at: new Date().toISOString(),
  }
  const { data, error } = await adminClient.from('alerts').insert(payload).select().single()
  if (error) throw new Error(`createTestAlert failed: ${error.message}`)
  return { id: data.id, vehicle_id: data.vehicle_id, type: data.type, message: data.message }
}

export async function deleteTestAlert(alertId: string): Promise<void> {
  await adminClient.from('alerts').delete().eq('id', alertId)
}

/** Assigns a vehicle to a driver (looked up by email). */
export async function assignVehicleToDriver(driverEmail: string, vehicleId: string | null): Promise<void> {
  const { data } = await adminClient.from('users').select('id').eq('email', driverEmail).single()
  if (!data) throw new Error(`assignVehicleToDriver: user not found for email ${driverEmail}`)
  await adminClient
    .from('drivers')
    .update({ assigned_vehicle_id: vehicleId })
    .eq('user_id', data.id)
}

/** Creates a test charging station. */
export async function createTestChargingStation(overrides: Partial<{
  name: string; address: string; power_kw: number; is_active: boolean
}> = {}): Promise<TestChargingStation> {
  const payload = {
    name: overrides.name ?? `Test Station ${Date.now()}`,
    address: overrides.address ?? '123 Test St, KL',
    coordinates: '3.140853,101.686855',
    connector_type: 'Type 2',
    power_kw: overrides.power_kw ?? 50,
    is_active: overrides.is_active ?? true,
    installed_at: new Date().toISOString(),
  }
  const { data, error } = await adminClient.from('charging_stations').insert(payload).select().single()
  if (error) throw new Error(`createTestChargingStation failed: ${error.message}`)
  return { id: data.id, name: data.name }
}

export async function deleteTestChargingStation(stationId: string): Promise<void> {
  await adminClient.from('charging_stations').delete().eq('id', stationId)
}

/** Resets the force_password_reset_at to yesterday (forces reset on next login). */
export async function expirePasswordReset(userId: string): Promise<void> {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  await adminClient
    .from('users')
    .update({ force_password_reset_at: yesterday.toISOString() })
    .eq('id', userId)
}

/** Sets force_password_reset_at 30 days ahead (clears forced state). */
export async function clearPasswordReset(userId: string): Promise<void> {
  const nextReset = new Date()
  nextReset.setDate(nextReset.getDate() + 30)
  await adminClient
    .from('users')
    .update({ force_password_reset_at: nextReset.toISOString() })
    .eq('id', userId)
}
