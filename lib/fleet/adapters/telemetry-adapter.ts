import type { TelemetrySnapshot } from '../types'

export interface TelemetryAdapter {
  getSnapshot(vehicleId: string): Promise<TelemetrySnapshot>
  getAllSnapshots(): Promise<TelemetrySnapshot[]>
  subscribe?(vehicleId: string, callback: (snapshot: TelemetrySnapshot) => void): () => void
}
