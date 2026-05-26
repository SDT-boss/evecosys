/** Factories for test data strings and objects. Keeps test bodies clean. */

let seq = 0

function next() {
  return ++seq
}

export function ephemeralEmail(prefix = 'user') {
  return `${prefix}-${Date.now()}-${next()}@evecosys-test.com`
}

export function testPlate() {
  return `TEST-${Date.now()}-${next()}`
}

export function testStationName() {
  return `Test Station ${Date.now()}-${next()}`
}

export function driverPayload(overrides: Record<string, string> = {}) {
  return {
    fullName: `Test Driver ${next()}`,
    email: ephemeralEmail('driver'),
    password: 'TestPassword123!',
    role: 'driver' as const,
    ...overrides,
  }
}

export function managerPayload(overrides: Record<string, string> = {}) {
  return {
    fullName: `Test Manager ${next()}`,
    email: ephemeralEmail('manager'),
    password: 'TestPassword123!',
    role: 'manager' as const,
    ...overrides,
  }
}

export function boardPayload(overrides: Record<string, string> = {}) {
  return {
    fullName: `Test Board ${next()}`,
    email: ephemeralEmail('board'),
    password: 'TestPassword123!',
    role: 'board' as const,
    ...overrides,
  }
}
