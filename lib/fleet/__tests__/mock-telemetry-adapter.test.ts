import { describe, it, expect, beforeEach } from 'vitest'
import { MockTelemetryAdapter } from '../adapters/mock-telemetry-adapter'

describe('MockTelemetryAdapter', () => {
  let adapter: MockTelemetryAdapter

  beforeEach(() => { adapter = new MockTelemetryAdapter() })

  it('throws when getting snapshot for unknown vehicle', async () => {
    await expect(adapter.getSnapshot('v-unknown')).rejects.toThrow('No snapshot for vehicle v-unknown')
  })

  it('returns snapshot after setSnapshot', async () => {
    adapter.setSnapshot('v1', { batteryPercent: 75, latitude: 14.5, longitude: 121.0, speedKmh: 60 })
    const snap = await adapter.getSnapshot('v1')
    expect(snap.vehicleId).toBe('v1')
    expect(snap.batteryPercent).toBe(75)
    expect(snap.timestamp).toBeInstanceOf(Date)
  })

  it('getAllSnapshots returns all set vehicles', async () => {
    adapter.setSnapshot('v1', { batteryPercent: 80, latitude: 14.5, longitude: 121.0, speedKmh: 50 })
    adapter.setSnapshot('v2', { batteryPercent: 60, latitude: 14.6, longitude: 121.1, speedKmh: 70 })
    const all = await adapter.getAllSnapshots()
    expect(all).toHaveLength(2)
    expect(all.map(s => s.vehicleId).sort()).toEqual(['v1', 'v2'])
  })

  it('overrides existing snapshot on second setSnapshot', async () => {
    adapter.setSnapshot('v1', { batteryPercent: 80, latitude: 14.5, longitude: 121.0, speedKmh: 50 })
    adapter.setSnapshot('v1', { batteryPercent: 50, latitude: 14.5, longitude: 121.0, speedKmh: 50 })
    const snap = await adapter.getSnapshot('v1')
    expect(snap.batteryPercent).toBe(50)
  })
})
