/**
 * Runs once after all test projects.
 * Cleans up any leaked test data not cleaned by individual tests.
 * Does NOT delete the test users — they are reused across runs.
 */
import dotenv from 'dotenv'
import { adminClient } from './helpers/supabase.admin'
import { TEST_USERS } from './helpers/auth.helpers'

dotenv.config({ path: '.env.local' })

export default async function globalTeardown() {
  console.log('\n[E2E] Global teardown — cleaning leaked test data...')

  try {
    // Delete any test vehicles whose plate_no starts with 'TEST-'
    const { data: testVehicles } = await adminClient
      .from('vehicles')
      .select('id')
      .like('plate_no', 'TEST-%')

    if (testVehicles && testVehicles.length > 0) {
      const ids = testVehicles.map((v) => v.id)
      await adminClient.from('trips').delete().in('vehicle_id', ids)
      await adminClient.from('alerts').delete().in('vehicle_id', ids)
      await adminClient.from('drivers').update({ assigned_vehicle_id: null }).in('assigned_vehicle_id', ids)
      await adminClient.from('vehicles').delete().in('id', ids)
      console.log(`  ✓ Cleaned ${ids.length} test vehicle(s)`)
    }

    // Delete test charging stations
    await adminClient.from('charging_stations').delete().like('name', 'Test Station%')

    // Delete users created during tests (NOT the permanent test users)
    // These are identified by email containing '@evecosys-test.com' except the main 3
    const keepEmails = Object.values(TEST_USERS).map((u) => u.email)
    const { data: ephemeralUsers } = await adminClient
      .from('users')
      .select('id')
      .like('email', '%@evecosys-test.com')
      .not('email', 'in', `(${keepEmails.map((e) => `'${e}'`).join(',')})`)

    if (ephemeralUsers && ephemeralUsers.length > 0) {
      for (const u of ephemeralUsers) {
        await adminClient.from('users').delete().eq('id', u.id)
        await adminClient.auth.admin.deleteUser(u.id)
      }
      console.log(`  ✓ Cleaned ${ephemeralUsers.length} ephemeral user(s)`)
    }
  } catch (err) {
    console.error('[E2E] Teardown error (non-fatal):', err)
  }

  console.log('[E2E] Global teardown complete.\n')
}
