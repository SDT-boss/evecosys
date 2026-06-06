/**
 * Custom Playwright fixtures extending the base test object.
 * Import `test` and `expect` from this file in all specs.
 */
import { test as base, expect } from '@playwright/test'
import {
  createTestVehicle,
  deleteTestVehicle,
  createTestAlert,
  deleteTestAlert,
  createTestChargingStation,
  deleteTestChargingStation,
  assignVehicleToDriver,
  type TestVehicle,
  type TestAlert,
  type TestChargingStation,
} from '../helpers/supabase.admin'
import { TEST_USERS } from '../helpers/auth.helpers'

type E2EFixtures = {
  /** A test vehicle scoped to this test — auto-deleted after. */
  testVehicle: TestVehicle
  /** An unresolved alert on a test vehicle — auto-deleted after. */
  testAlert: { alert: TestAlert; vehicle: TestVehicle }
  /** A test charging station — auto-deleted after. */
  testStation: TestChargingStation
  /** Test vehicle assigned to the E2E driver user — auto-cleaned after. */
  driverVehicle: TestVehicle
}


export const test = base.extend<E2EFixtures>({
  testVehicle: async ({}, use) => {
    const vehicle = await createTestVehicle()
    await use(vehicle)
    await deleteTestVehicle(vehicle.id)
  },

  testAlert: async ({}, use) => {
    const vehicle = await createTestVehicle()
    const alert = await createTestAlert(vehicle.id)
    await use({ alert, vehicle })
    await deleteTestAlert(alert.id)
    await deleteTestVehicle(vehicle.id)
  },

  testStation: async ({}, use) => {
    const station = await createTestChargingStation()
    await use(station)
    await deleteTestChargingStation(station.id)
  },

  driverVehicle: async ({}, use) => {
    const vehicle = await createTestVehicle({ status: 'Parked' })
    await assignVehicleToDriver(TEST_USERS.driver.email, vehicle.id)
    await use(vehicle)
    await assignVehicleToDriver(TEST_USERS.driver.email, null)
    await deleteTestVehicle(vehicle.id)
  },
})

export { expect }
