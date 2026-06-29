import type { TelemetryAdapter } from '@/lib/fleet/adapters/telemetry-adapter'
import type { TelemetrySnapshot } from '@/lib/fleet/types'

type SnapshotInput = Omit<TelemetrySnapshot, 'vehicleId' | 'timestamp'>

export class MockTelemetryAdapter implements TelemetryAdapter {
  private snapshots = new Map<string, TelemetrySnapshot>()

  setSnapshot(vehicleId: string, data: SnapshotInput): void {
    this.snapshots.set(vehicleId, { vehicleId, timestamp: new Date(), ...data })
  }

  async getSnapshot(vehicleId: string): Promise<TelemetrySnapshot> {
    const snapshot = this.snapshots.get(vehicleId)
    if (!snapshot) throw new Error(`No snapshot for vehicle ${vehicleId}`)
    return snapshot
  }

  async getAllSnapshots(): Promise<TelemetrySnapshot[]> {
    return Array.from(this.snapshots.values())
  }
}
