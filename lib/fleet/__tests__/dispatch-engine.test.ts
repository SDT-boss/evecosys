import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DispatchEngine } from '../dispatch-engine'
import { MockTelemetryAdapter } from '../adapters/mock-telemetry-adapter'
import type { FleetRepository } from '../fleet-repository'
import type { Vehicle, Charger, Shift } from '../types'

const depot: Charger = { id: 'depot', latitude: 14.5, longitude: 121.0, type: 'DEPOT', isOccupied: false }
const patrolStart = { latitude: 14.5, longitude: 121.0 }

function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'v1', model: 'AION_Y_PLUS', plateNumber: 'AAA-001',
    status: 'PATROLLING', currentShiftId: 's1', assignedChargerId: null,
    ...overrides,
  }
}

function makeShift(overrides: Partial<Shift> = {}): Shift {
  const now = new Date()
  return {
    id: 's1', shiftNumber: 1, vehicleId: 'v1',
    startTime: new Date(now.getTime() - 60_000),
    endTime: new Date(now.getTime() + 3_600_000),
    driverIds: ['d1', 'd2', 'd3'],
    status: 'SCHEDULED',
    ...overrides,
  }
}

function makeMockRepo(overrides: Partial<FleetRepository> = {}): FleetRepository {
  return {
    getVehicle:          vi.fn().mockResolvedValue(makeVehicle()),
    getActiveVehicles:   vi.fn().mockResolvedValue([]),
    getIdleVehicles:     vi.fn().mockResolvedValue([]),
    getActiveShifts:     vi.fn().mockResolvedValue([]),
    getChargers:         vi.fn().mockResolvedValue([depot]),
    updateVehicleStatus: vi.fn().mockResolvedValue(undefined),
    updateShiftStatus:   vi.fn().mockResolvedValue(undefined),
    saveDispatchEvent:   vi.fn().mockResolvedValue(undefined),
    notifyDispatcher:    vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('DispatchEngine.evaluateFleet', () => {
  it('does not reroute a PATROLLING vehicle with sufficient battery near depot', async () => {
    const telemetry = new MockTelemetryAdapter()
    telemetry.setSnapshot('v1', { batteryPercent: 80, latitude: 14.5, longitude: 121.0, speedKmh: 60 })

    const repo = makeMockRepo({
      getActiveVehicles: vi.fn().mockResolvedValue([makeVehicle({ status: 'PATROLLING' })]),
    })
    const engine = new DispatchEngine(telemetry, repo, patrolStart)
    await engine.evaluateFleet()

    expect(repo.updateVehicleStatus).not.toHaveBeenCalledWith('v1', 'ROUTING_TO_CHARGER', expect.anything())
  })

  it('reroutes a PATROLLING vehicle when shouldReroute returns true', async () => {
    const farCharger: Charger = { id: 'far', latitude: 16.0, longitude: 123.0, type: 'HIGHWAY', isOccupied: false }
    const telemetry = new MockTelemetryAdapter()
    telemetry.setSnapshot('v1', { batteryPercent: 22, latitude: 14.5, longitude: 121.0, speedKmh: 60, bearingDeg: 90 })

    const repo = makeMockRepo({
      getActiveVehicles: vi.fn().mockResolvedValue([makeVehicle({ status: 'PATROLLING' })]),
      getChargers:       vi.fn().mockResolvedValue([farCharger]),
    })
    const engine = new DispatchEngine(telemetry, repo, patrolStart)
    await engine.evaluateFleet()

    expect(repo.updateVehicleStatus).toHaveBeenCalledWith('v1', 'ROUTING_TO_CHARGER', expect.any(String))
    expect(repo.saveDispatchEvent).toHaveBeenCalled()
  })

  it('starts a SCHEDULED shift when startTime has passed', async () => {
    const telemetry = new MockTelemetryAdapter()
    telemetry.setSnapshot('v1', { batteryPercent: 80, latitude: 14.5, longitude: 121.0, speedKmh: 0 })

    const repo = makeMockRepo({
      getActiveVehicles: vi.fn().mockResolvedValue([]),
      getActiveShifts:   vi.fn().mockResolvedValue([makeShift({ status: 'SCHEDULED' })]),
      getVehicle:        vi.fn().mockResolvedValue(makeVehicle({ status: 'IDLE' })),
    })
    const engine = new DispatchEngine(telemetry, repo, patrolStart)
    await engine.evaluateFleet()

    expect(repo.updateVehicleStatus).toHaveBeenCalledWith('v1', 'DISPATCHED', undefined)
    expect(repo.updateShiftStatus).toHaveBeenCalledWith('s1', 'ACTIVE')
  })

  it('completes shift without changing vehicle status when vehicle is CHARGING at shift end', async () => {
    const telemetry = new MockTelemetryAdapter()
    telemetry.setSnapshot('v1', { batteryPercent: 60, latitude: 14.5, longitude: 121.0, speedKmh: 0 })

    const endedShift = makeShift({
      status: 'ACTIVE',
      startTime: new Date(Date.now() - 8 * 3_600_000),
      endTime:   new Date(Date.now() - 1000),
    })
    const repo = makeMockRepo({
      getActiveVehicles: vi.fn().mockResolvedValue([]),
      getActiveShifts:   vi.fn().mockResolvedValue([endedShift]),
      getVehicle:        vi.fn().mockResolvedValue(makeVehicle({ status: 'CHARGING' })),
    })
    const engine = new DispatchEngine(telemetry, repo, patrolStart)
    await engine.evaluateFleet()

    expect(repo.updateShiftStatus).toHaveBeenCalledWith('s1', 'COMPLETED')
    expect(repo.updateVehicleStatus).not.toHaveBeenCalled()
    expect(repo.notifyDispatcher).toHaveBeenCalledWith(
      expect.stringContaining('CHARGING'),
      expect.any(Object)
    )
  })

  it('notifies dispatcher when shift vehicle is NOT_READY at shift start', async () => {
    const telemetry = new MockTelemetryAdapter()
    telemetry.setSnapshot('v1', { batteryPercent: 15, latitude: 14.5, longitude: 121.0, speedKmh: 0 })

    const repo = makeMockRepo({
      getActiveVehicles: vi.fn().mockResolvedValue([]),
      getActiveShifts:   vi.fn().mockResolvedValue([makeShift({ status: 'SCHEDULED' })]),
      getVehicle:        vi.fn().mockResolvedValue(makeVehicle({ status: 'IDLE' })),
    })
    const engine = new DispatchEngine(telemetry, repo, patrolStart)
    await engine.evaluateFleet()

    expect(repo.notifyDispatcher).toHaveBeenCalledWith(
      expect.stringContaining('NOT_READY'),
      expect.any(Object)
    )
    expect(repo.updateVehicleStatus).not.toHaveBeenCalled()
  })
})

describe('DispatchEngine.selectVehicleForDispatch', () => {
  it('returns null when no idle vehicles', async () => {
    const engine = new DispatchEngine(new MockTelemetryAdapter(), makeMockRepo(), patrolStart)
    expect(await engine.selectVehicleForDispatch()).toBeNull()
  })

  it('returns highest-scoring READY vehicle', async () => {
    const telemetry = new MockTelemetryAdapter()
    telemetry.setSnapshot('v1', { batteryPercent: 90, latitude: 14.5, longitude: 121.0, speedKmh: 0 })
    telemetry.setSnapshot('v2', { batteryPercent: 55, latitude: 14.5, longitude: 121.0, speedKmh: 0 })

    const repo = makeMockRepo({
      getIdleVehicles: vi.fn().mockResolvedValue([
        makeVehicle({ id: 'v1', status: 'IDLE' }),
        makeVehicle({ id: 'v2', status: 'IDLE' }),
      ]),
    })
    const engine = new DispatchEngine(telemetry, repo, patrolStart)
    expect((await engine.selectVehicleForDispatch())?.vehicleId).toBe('v1')
  })

  it('notifies dispatcher when all idle vehicles are NOT_READY', async () => {
    const telemetry = new MockTelemetryAdapter()
    telemetry.setSnapshot('v1', { batteryPercent: 10, latitude: 14.5, longitude: 121.0, speedKmh: 0 })

    const repo = makeMockRepo({
      getIdleVehicles: vi.fn().mockResolvedValue([makeVehicle({ id: 'v1', status: 'IDLE' })]),
    })
    const engine = new DispatchEngine(telemetry, repo, patrolStart)
    const result = await engine.selectVehicleForDispatch()
    expect(result).toBeNull()
    expect(repo.notifyDispatcher).toHaveBeenCalledWith(
      expect.stringContaining('coverage gap'),
      expect.anything()
    )
  })
})
