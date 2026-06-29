import { calcFleetHealth } from '@/lib/fleetHealth'
import type { Vehicle, Alert } from '@/types'

function vehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'v1', brand: 'Tesla', model: 'Model 3', plate_no: 'ABC123',
    soc: 80, soh: 90, status: 'IDLE', location_name: 'HQ',
    location_detail: '', coordinates: '', odometer: 10000,
    year: 2023, created_at: '2026-01-01',
    ...overrides,
  }
}

function alert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'a1', vehicle_id: 'v1', type: 'low_battery',
    message: 'Low battery', resolved: false,
    created_at: '2026-01-01',
    ...overrides,
  }
}

describe('calcFleetHealth', () => {
  it('returns score 0 and grade F for empty fleet', () => {
    const r = calcFleetHealth([], [])
    expect(r.score).toBe(0)
    expect(r.grade).toBe('F')
    expect(r.label).toBe('No data')
  })

  it('scores are within 0–100 range', () => {
    const r = calcFleetHealth([vehicle(), vehicle()], [alert()])
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(100)
  })

  it('assigns grade A for a healthy fleet with high SOH and no alerts', () => {
    const vehicles = [vehicle({ soh: 95 }), vehicle({ soh: 98 })]
    const r = calcFleetHealth(vehicles, [])
    expect(r.grade).toBe('A')
    expect(r.label).toBe('Excellent')
    expect(r.color).toBe('#5a9e2f')
  })

  it('breakdown.batteryHealth reflects average SOH', () => {
    const vehicles = [vehicle({ soh: 80 }), vehicle({ soh: 60 })]
    const r = calcFleetHealth(vehicles, [])
    expect(r.breakdown.batteryHealth).toBe(70)
  })

  it('breakdown.availability decreases when vehicles are OFFLINE', () => {
    const allActive = [vehicle({ status: 'PATROLLING' }), vehicle({ status: 'IDLE' })]
    const oneOffline = [vehicle({ status: 'PATROLLING' }), vehicle({ status: 'OFFLINE' })]
    const r1 = calcFleetHealth(allActive, [])
    const r2 = calcFleetHealth(oneOffline, [])
    expect(r1.breakdown.availability).toBeGreaterThan(r2.breakdown.availability)
  })

  it('breakdown.alertLoad decreases as alert count rises', () => {
    const noAlerts = calcFleetHealth([vehicle()], [])
    const manyAlerts = calcFleetHealth([vehicle()], [alert(), alert(), alert(), alert(), alert()])
    expect(noAlerts.breakdown.alertLoad).toBeGreaterThan(manyAlerts.breakdown.alertLoad)
  })

  it('breakdown.alertLoad is clamped at 0 with excessive alerts', () => {
    const lotsOfAlerts = Array.from({ length: 20 }, (_, i) => alert({ id: `a${i}` }))
    const r = calcFleetHealth([vehicle()], lotsOfAlerts)
    expect(r.breakdown.alertLoad).toBe(0)
  })

  it('returns correct grade labels', () => {
    expect(calcFleetHealth([vehicle({ soh: 95 })], []).label).toBe('Excellent')
    const lowSoh = [vehicle({ soh: 50 }), vehicle({ soh: 45 })]
    const grade = calcFleetHealth(lowSoh, Array.from({ length: 5 }, () => alert())).grade
    expect(['C', 'D', 'F']).toContain(grade)
  })
})
