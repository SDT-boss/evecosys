import type { VehicleStatus, DispatchEvent, DispatchAction } from '@/lib/fleet/types'
import { randomUUID } from 'crypto'

const ALLOWED_TRANSITIONS: Partial<Record<VehicleStatus, VehicleStatus[]>> = {
  IDLE:               ['DISPATCHED', 'OFFLINE'],
  DISPATCHED:         ['PATROLLING', 'IDLE', 'OFFLINE'],
  PATROLLING:         ['ROUTING_TO_CHARGER', 'IDLE', 'OFFLINE'],
  ROUTING_TO_CHARGER: ['CHARGING', 'OFFLINE'],
  CHARGING:           ['PATROLLING', 'OFFLINE'],
  OFFLINE:            ['IDLE'],
}

export function canTransition(from: VehicleStatus, to: VehicleStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

export function createDispatchEvent(
  vehicleId: string,
  from: VehicleStatus,
  to: VehicleStatus,
  action: DispatchAction,
  triggeredBy: 'SYSTEM' | 'DISPATCHER',
  metadata?: Record<string, unknown>
): DispatchEvent {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid transition: ${from} → ${to}`)
  }
  return {
    id: randomUUID(),
    vehicleId,
    triggeredBy,
    action,
    previousStatus: from,
    newStatus: to,
    timestamp: new Date(),
    metadata,
  }
}
