import type { TelemetrySnapshot } from '@/lib/fleet/types'

export interface TelemetryAdapter {
  getSnapshot(vehicleId: string): Promise<TelemetrySnapshot>
  getAllSnapshots(): Promise<TelemetrySnapshot[]>
  subscribe?(vehicleId: string, callback: (snapshot: TelemetrySnapshot) => void): () => void
}
