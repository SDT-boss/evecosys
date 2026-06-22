# Trip Planner Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the standalone EV Fleet Trip Planner module (fleet dispatch logic, tests, DB schema) into the evecosys Next.js app.

**Architecture:** Copy the complete `lib/fleet/` module verbatim from `Trip Planner/src/lib/fleet/`, write a single DB migration that extends existing tables and creates new ones, adapt `SupabaseFleetRepository` for evecosys column naming, and update the four UI components that display vehicle status. The `Trip Planner/` folder is deleted after integration.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (PostgreSQL), Vitest

**Design spec:** `docs/superpowers/specs/2026-06-21-trip-planner-integration-design.md`

---

## File Map

**Create:**
```
lib/fleet/types.ts
lib/fleet/constants.ts
lib/fleet/fleet-repository.ts
lib/fleet/geo.ts
lib/fleet/battery.ts
lib/fleet/state-machine.ts
lib/fleet/shift-manager.ts
lib/fleet/dispatch-engine.ts
lib/fleet/supabase-fleet-repository.ts        ← adapted (table/column names differ)
lib/fleet/adapters/telemetry-adapter.ts
lib/fleet/adapters/mock-telemetry-adapter.ts
lib/fleet/__tests__/geo.test.ts
lib/fleet/__tests__/battery.test.ts
lib/fleet/__tests__/state-machine.test.ts
lib/fleet/__tests__/shift-manager.test.ts
lib/fleet/__tests__/mock-telemetry-adapter.test.ts
lib/fleet/__tests__/dispatch-engine.test.ts
app/api/fleet/evaluate/route.ts               ← adapted (uses @/lib/supabase/service)
supabase/migrations/20260621000000_fleet_integration.sql
```

**Modify:**
```
types/index.ts                                ← Vehicle.status + new fields; ChargingStation + new fields
lib/fleetHealth.ts                            ← status !== 'Maintenance' → status !== 'OFFLINE'
app/(dashboard)/board/page.tsx                ← statusCounts shape + online calculation
components/manager/VehicleDrawer.tsx          ← statusVariant()
components/manager/AssetManagementClient.tsx  ← statusVariant() + status filter list
components/board/BoardTabsClient.tsx          ← BoardData.statusCounts type + statusColors
components/manager/DriversClient.tsx          ← inline status badge
test/unit/lib/fleetHealth.test.ts             ← Vehicle fixture uses new status values
```

**Delete:**
```
Trip Planner/    (entire folder — separate git repo, rm -rf after all tasks complete)
```

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260621000000_fleet_integration.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260621000000_fleet_integration.sql`:

```sql
-- Fleet integration migration
-- Order: alter charging_stations → create shifts → alter vehicles → create dispatch_events
-- (vehicles.current_shift_id FK requires shifts to exist first)

-- ─── 1. Extend charging_stations with dispatch columns ────────────────────────
alter table public.charging_stations
  add column if not exists latitude    float8,
  add column if not exists longitude   float8,
  add column if not exists type        text check (type in ('DEPOT', 'HIGHWAY')),
  add column if not exists is_occupied boolean not null default false;

-- ─── 2. Create shifts ─────────────────────────────────────────────────────────
create table if not exists public.shifts (
  id            uuid        primary key default gen_random_uuid(),
  shift_number  int         not null check (shift_number in (1, 2, 3)),
  start_time    timestamptz not null,
  end_time      timestamptz not null,
  vehicle_id    uuid        not null references public.vehicles(id) on delete restrict,
  driver_ids    uuid[]      not null default '{}',
  status        text        not null default 'SCHEDULED'
                            check (status in ('SCHEDULED', 'ACTIVE', 'COMPLETED')),
  created_at    timestamptz not null default now()
);

create index if not exists shifts_status_idx   on public.shifts(status);
create index if not exists shifts_vehicle_idx  on public.shifts(vehicle_id);

-- ─── 3. Alter vehicles ────────────────────────────────────────────────────────

-- 3a. Drop old status constraint
alter table public.vehicles
  drop constraint if exists vehicles_status_check;

-- 3b. Migrate existing status values to dispatch statuses
update public.vehicles set status = 'PATROLLING'        where status = 'Moving';
update public.vehicles set status = 'IDLE'              where status = 'Parked';
update public.vehicles set status = 'CHARGING'          where status = 'Charging';
update public.vehicles set status = 'OFFLINE'           where status = 'Maintenance';

-- 3c. Add new status constraint
alter table public.vehicles
  add constraint vehicles_status_check
  check (status in ('IDLE','DISPATCHED','PATROLLING','ROUTING_TO_CHARGER','CHARGING','OFFLINE'));

-- 3d. Add dispatch columns
alter table public.vehicles
  add column if not exists current_shift_id    uuid null,
  add column if not exists assigned_charger_id uuid null
    references public.charging_stations(id) on delete set null;

-- 3e. Add FK from vehicles.current_shift_id → shifts (now that shifts exists)
alter table public.vehicles
  add constraint vehicles_current_shift_id_fkey
  foreign key (current_shift_id) references public.shifts(id) on delete set null;

-- ─── 4. Create dispatch_events ────────────────────────────────────────────────
create table if not exists public.dispatch_events (
  id              uuid        primary key default gen_random_uuid(),
  vehicle_id      uuid        not null references public.vehicles(id) on delete cascade,
  triggered_by    text        not null check (triggered_by in ('SYSTEM', 'DISPATCHER')),
  action          text        not null check (action in (
                    'DISPATCH', 'REROUTE_TO_CHARGER', 'RETURN_TO_PATROL', 'OVERRIDE'
                  )),
  previous_status text        not null,
  new_status      text        not null,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists dispatch_events_vehicle_idx on public.dispatch_events(vehicle_id);
create index if not exists dispatch_events_created_idx on public.dispatch_events(created_at desc);
create index if not exists vehicles_status_idx         on public.vehicles(status);
```

- [ ] **Step 2: Apply the migration**

```bash
make migrate
```

Expected: migration applies without errors. If `make migrate` fails, run:
```bash
npx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260621000000_fleet_integration.sql
git commit -m "feat(db): fleet integration migration — extend vehicles/charging_stations, add shifts/dispatch_events"
```

---

## Task 2: Fleet Foundation Files (Types, Constants, Repository Interface)

**Files:**
- Create: `lib/fleet/types.ts`
- Create: `lib/fleet/constants.ts`
- Create: `lib/fleet/fleet-repository.ts`

These are verbatim copies. No changes from the Trip Planner originals.

- [ ] **Step 1: Create `lib/fleet/types.ts`**

```ts
export interface Coords {
  latitude: number
  longitude: number
}

export type VehicleModel =
  | 'AION_Y_PLUS'
  | 'JAC_T9'
  | 'FOTON_E_VIEW'
  | 'FOTON_E_MILLER'
  | 'FOTON_E_TRUCKMATE'

export type VehicleStatus =
  | 'IDLE'
  | 'DISPATCHED'
  | 'PATROLLING'
  | 'ROUTING_TO_CHARGER'
  | 'CHARGING'
  | 'OFFLINE'

export type ReadinessStatus = 'READY' | 'LOW_BATTERY' | 'CRITICAL_BATTERY' | 'NOT_READY'

export type DispatchAction =
  | 'DISPATCH'
  | 'REROUTE_TO_CHARGER'
  | 'RETURN_TO_PATROL'
  | 'OVERRIDE'

export interface Vehicle {
  id: string
  model: VehicleModel
  plateNumber: string
  status: VehicleStatus
  currentShiftId: string | null
  assignedChargerId: string | null
}

export interface TelemetrySnapshot extends Coords {
  vehicleId: string
  batteryPercent: number   // 0–100
  speedKmh: number
  bearingDeg?: number      // 0–360, optional — populated by real telematics adapter
  timestamp: Date
}

export interface Charger extends Coords {
  id: string
  type: 'DEPOT' | 'HIGHWAY'
  isOccupied: boolean
}

export interface Shift {
  id: string
  shiftNumber: 1 | 2 | 3
  startTime: Date
  endTime: Date
  vehicleId: string
  driverIds: string[]
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED'
}

export interface DispatchEvent {
  id: string
  vehicleId: string
  triggeredBy: 'SYSTEM' | 'DISPATCHER'
  action: DispatchAction
  previousStatus: VehicleStatus
  newStatus: VehicleStatus
  timestamp: Date
  metadata?: Record<string, unknown>
}

export interface VehicleSpec {
  batteryKwh: number
  rangeKm: number
}

export interface ShiftScheduleEntry {
  shiftNumber: 1 | 2 | 3
  startHour: number
  endHour: number
}

export interface RerouteResult {
  reroute: boolean
  targetChargerId?: string
}

export interface ScoredVehicle {
  vehicleId: string
  score: number
  readiness: ReadinessStatus
  snapshot: TelemetrySnapshot
}
```

- [ ] **Step 2: Create `lib/fleet/constants.ts`**

```ts
import type { VehicleModel, VehicleSpec, ShiftScheduleEntry } from './types'

export const VEHICLE_SPECS: Record<VehicleModel, VehicleSpec> = {
  AION_Y_PLUS:       { batteryKwh: 70.8, rangeKm: 600 },
  JAC_T9:            { batteryKwh: 81.0, rangeKm: 350 },
  FOTON_E_VIEW:      { batteryKwh: 55.0, rangeKm: 350 },
  FOTON_E_MILLER:    { batteryKwh: 60.0, rangeKm: 280 },
  FOTON_E_TRUCKMATE: { batteryKwh: 50.0, rangeKm: 230 },
}

export const CHARGE_TARGET_PERCENT = 80
export const REROUTE_THRESHOLD_PERCENT = 20
export const REROUTE_PROXIMITY_KM = 5
export const ARRIVAL_RADIUS_M = 200
export const FLEET_EVALUATE_INTERVAL_MS = 30_000

export const SHIFT_SCHEDULE: ShiftScheduleEntry[] = [
  { shiftNumber: 1, startHour: 6,  endHour: 14 },
  { shiftNumber: 2, startHour: 14, endHour: 22 },
  { shiftNumber: 3, startHour: 22, endHour: 6  },
]
```

- [ ] **Step 3: Create `lib/fleet/fleet-repository.ts`**

```ts
import type { Vehicle, Charger, Shift, DispatchEvent } from './types'

export interface FleetRepository {
  getVehicle(vehicleId: string): Promise<Vehicle>
  getActiveVehicles(): Promise<Vehicle[]>
  getIdleVehicles(): Promise<Vehicle[]>
  getActiveShifts(): Promise<Shift[]>
  getChargers(): Promise<Charger[]>
  updateVehicleStatus(
    vehicleId: string,
    status: Vehicle['status'],
    assignedChargerId?: string | null
  ): Promise<void>
  updateShiftStatus(shiftId: string, status: Shift['status']): Promise<void>
  saveDispatchEvent(event: DispatchEvent): Promise<void>
  notifyDispatcher(message: string, metadata?: Record<string, unknown>): Promise<void>
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
make typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/fleet/types.ts lib/fleet/constants.ts lib/fleet/fleet-repository.ts
git commit -m "feat(fleet): add fleet types, constants, and FleetRepository interface"
```

---

## Task 3: Geo Utilities

**Files:**
- Create: `lib/fleet/geo.ts`
- Create: `lib/fleet/__tests__/geo.test.ts`

- [ ] **Step 1: Create `lib/fleet/__tests__/geo.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { haversineKm, projectPosition, getNearestCharger } from '../geo'
import type { Charger } from '../types'

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm({ latitude: 14.5, longitude: 121.0 }, { latitude: 14.5, longitude: 121.0 })).toBe(0)
  })

  it('returns approximate distance between two known points', () => {
    const dist = haversineKm(
      { latitude: 14.5995, longitude: 120.9842 },
      { latitude: 14.6760, longitude: 121.0437 }
    )
    expect(dist).toBeGreaterThan(9)
    expect(dist).toBeLessThan(12)
  })

  it('is symmetric', () => {
    const a = { latitude: 14.5, longitude: 121.0 }
    const b = { latitude: 14.6, longitude: 121.1 }
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 5)
  })
})

describe('projectPosition', () => {
  it('returns origin when distance is 0', () => {
    const origin = { latitude: 14.5, longitude: 121.0 }
    const result = projectPosition(origin, 0, 0)
    expect(result.latitude).toBeCloseTo(14.5, 4)
    expect(result.longitude).toBeCloseTo(121.0, 4)
  })

  it('projects north by ~111km and increases latitude by ~1 degree', () => {
    const origin = { latitude: 14.0, longitude: 121.0 }
    const result = projectPosition(origin, 0, 111)
    expect(result.latitude).toBeCloseTo(15.0, 0)
    expect(result.longitude).toBeCloseTo(121.0, 1)
  })
})

describe('getNearestCharger', () => {
  const chargers: Charger[] = [
    { id: 'c1', latitude: 14.5, longitude: 121.0, type: 'DEPOT',   isOccupied: false },
    { id: 'c2', latitude: 14.6, longitude: 121.1, type: 'HIGHWAY', isOccupied: false },
    { id: 'c3', latitude: 15.0, longitude: 122.0, type: 'HIGHWAY', isOccupied: false },
  ]

  it('returns null for empty charger list', () => {
    expect(getNearestCharger({ latitude: 14.5, longitude: 121.0 }, [])).toBeNull()
  })

  it('returns the closest charger', () => {
    const result = getNearestCharger({ latitude: 14.5, longitude: 121.0 }, chargers)
    expect(result?.charger.id).toBe('c1')
    expect(result?.distanceKm).toBeCloseTo(0, 1)
  })

  it('picks closer charger', () => {
    const result = getNearestCharger({ latitude: 14.55, longitude: 121.05 }, chargers)
    expect(['c1', 'c2']).toContain(result?.charger.id)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (module not found)**

```bash
npx vitest run lib/fleet/__tests__/geo.test.ts
```

Expected: FAIL — `Cannot find module '../geo'`

- [ ] **Step 3: Create `lib/fleet/geo.ts`**

```ts
import type { Coords, Charger } from './types'

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

// Straight-line projection along a bearing.
// Prototype: bearing defaults to 0 (north) when not provided by telematics.
// Replace with road-network projection (e.g. OSRM) for production accuracy.
export function projectPosition(
  origin: Coords,
  bearingDeg: number,
  distanceKm: number
): Coords {
  if (distanceKm === 0) return { ...origin }
  const R = 6371
  const d = distanceKm / R
  const brng = toRad(bearingDeg)
  const lat1 = toRad(origin.latitude)
  const lon1 = toRad(origin.longitude)
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
    Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    )
  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: (lon2 * 180) / Math.PI,
  }
}

export function getNearestCharger(
  position: Coords,
  chargers: Charger[]
): { charger: Charger; distanceKm: number } | null {
  if (chargers.length === 0) return null
  let nearest = chargers[0]
  let minDist = haversineKm(position, chargers[0])
  for (let i = 1; i < chargers.length; i++) {
    const d = haversineKm(position, chargers[i])
    if (d < minDist) { minDist = d; nearest = chargers[i] }
  }
  return { charger: nearest, distanceKm: minDist }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run lib/fleet/__tests__/geo.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/fleet/geo.ts lib/fleet/__tests__/geo.test.ts
git commit -m "feat(fleet): add geo utilities — haversine, projectPosition, getNearestCharger"
```

---

## Task 4: Battery Logic

**Files:**
- Create: `lib/fleet/battery.ts`
- Create: `lib/fleet/__tests__/battery.test.ts`

- [ ] **Step 1: Create `lib/fleet/__tests__/battery.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { percentPerKm, remainingRangeKm, classifyReadiness, scoreVehicle, shouldReroute } from '../battery'
import type { TelemetrySnapshot, Charger } from '../types'

const makeSnapshot = (overrides: Partial<TelemetrySnapshot> = {}): TelemetrySnapshot => ({
  vehicleId: 'v1',
  batteryPercent: 80,
  latitude: 14.5,
  longitude: 121.0,
  speedKmh: 60,
  timestamp: new Date(),
  ...overrides,
})

const depot: Charger = { id: 'depot', latitude: 14.5, longitude: 121.0, type: 'DEPOT', isOccupied: false }
const farCharger: Charger = { id: 'far', latitude: 15.5, longitude: 122.0, type: 'HIGHWAY', isOccupied: false }

describe('percentPerKm', () => {
  it('returns 100/rangeKm for AION_Y_PLUS', () => {
    expect(percentPerKm('AION_Y_PLUS')).toBeCloseTo(100 / 600, 5)
  })
  it('returns 100/rangeKm for FOTON_E_TRUCKMATE', () => {
    expect(percentPerKm('FOTON_E_TRUCKMATE')).toBeCloseTo(100 / 230, 5)
  })
})

describe('remainingRangeKm', () => {
  it('calculates km left before hitting 20% threshold', () => {
    const snapshot = makeSnapshot({ batteryPercent: 80 })
    expect(remainingRangeKm(snapshot, 'AION_Y_PLUS')).toBeCloseTo(360, 0)
  })

  it('returns 0 when battery is exactly at threshold', () => {
    const snapshot = makeSnapshot({ batteryPercent: 20 })
    expect(remainingRangeKm(snapshot, 'AION_Y_PLUS')).toBeCloseTo(0, 1)
  })
})

describe('classifyReadiness', () => {
  it('returns READY above 50%', () => expect(classifyReadiness(51)).toBe('READY'))
  it('returns LOW_BATTERY between 30–50%', () => expect(classifyReadiness(35)).toBe('LOW_BATTERY'))
  it('returns CRITICAL_BATTERY between 20–30%', () => expect(classifyReadiness(25)).toBe('CRITICAL_BATTERY'))
  it('returns NOT_READY at or below 20%', () => {
    expect(classifyReadiness(20)).toBe('NOT_READY')
    expect(classifyReadiness(10)).toBe('NOT_READY')
  })
  it('returns LOW_BATTERY at exactly 50%', () => expect(classifyReadiness(50)).toBe('LOW_BATTERY'))
})

describe('scoreVehicle', () => {
  it('gives higher score to vehicle with more battery', () => {
    const patrol = { latitude: 14.5, longitude: 121.0 }
    const high = makeSnapshot({ batteryPercent: 90, latitude: 14.5, longitude: 121.0 })
    const low  = makeSnapshot({ batteryPercent: 40, latitude: 14.5, longitude: 121.0 })
    expect(scoreVehicle(high, patrol)).toBeGreaterThan(scoreVehicle(low, patrol))
  })

  it('gives higher score to vehicle closer to patrol start', () => {
    const patrol = { latitude: 14.5, longitude: 121.0 }
    const near = makeSnapshot({ batteryPercent: 60, latitude: 14.5, longitude: 121.0 })
    const far  = makeSnapshot({ batteryPercent: 60, latitude: 16.0, longitude: 123.0 })
    expect(scoreVehicle(near, patrol)).toBeGreaterThan(scoreVehicle(far, patrol))
  })

  it('proximity score never goes below 0', () => {
    const patrol = { latitude: 14.5, longitude: 121.0 }
    const veryFar = makeSnapshot({ batteryPercent: 50, latitude: 20.0, longitude: 130.0 })
    expect(scoreVehicle(veryFar, patrol)).toBeGreaterThanOrEqual(0)
  })
})

describe('shouldReroute', () => {
  it('returns false when vehicle is near a charger with sufficient battery', () => {
    const snapshot = makeSnapshot({ batteryPercent: 80, latitude: 14.5, longitude: 121.0 })
    const result = shouldReroute(snapshot, 'AION_Y_PLUS', [depot], 0)
    expect(result.reroute).toBe(false)
  })

  it('returns true with targetChargerId when projected position is far from all chargers', () => {
    const snapshot = makeSnapshot({ batteryPercent: 25, latitude: 14.5, longitude: 121.0 })
    const result = shouldReroute(snapshot, 'FOTON_E_TRUCKMATE', [farCharger], 90)
    expect(result.reroute).toBe(true)
    expect(result.targetChargerId).toBeDefined()
  })

  it('falls back to nearest charger when all are occupied', () => {
    const snapshot = makeSnapshot({ batteryPercent: 25, latitude: 14.5, longitude: 121.0 })
    const occupiedFar: Charger = { ...farCharger, isOccupied: true }
    const result = shouldReroute(snapshot, 'FOTON_E_TRUCKMATE', [occupiedFar], 90)
    expect(result.reroute).toBe(true)
  })

  it('returns false with empty charger list', () => {
    const snapshot = makeSnapshot({ batteryPercent: 50 })
    expect(shouldReroute(snapshot, 'AION_Y_PLUS', [], 0).reroute).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run lib/fleet/__tests__/battery.test.ts
```

Expected: FAIL — `Cannot find module '../battery'`

- [ ] **Step 3: Create `lib/fleet/battery.ts`**

```ts
import type { TelemetrySnapshot, VehicleModel, Charger, ReadinessStatus, RerouteResult, Coords } from './types'
import { VEHICLE_SPECS, REROUTE_THRESHOLD_PERCENT, REROUTE_PROXIMITY_KM } from './constants'
import { haversineKm, projectPosition, getNearestCharger } from './geo'

export function percentPerKm(model: VehicleModel): number {
  return 100 / VEHICLE_SPECS[model].rangeKm
}

export function remainingRangeKm(snapshot: TelemetrySnapshot, model: VehicleModel): number {
  return (snapshot.batteryPercent - REROUTE_THRESHOLD_PERCENT) / percentPerKm(model)
}

export function classifyReadiness(batteryPercent: number): ReadinessStatus {
  if (batteryPercent > 50) return 'READY'
  if (batteryPercent > 30) return 'LOW_BATTERY'
  if (batteryPercent > 20) return 'CRITICAL_BATTERY'
  return 'NOT_READY'
}

export function scoreVehicle(snapshot: TelemetrySnapshot, patrolStartCoords: Coords): number {
  const batteryScore   = (snapshot.batteryPercent / 100) * 60
  const distanceKm     = haversineKm(snapshot, patrolStartCoords)
  const proximityScore = Math.max(0, 1 - distanceKm / 200) * 40
  return batteryScore + proximityScore
}

export function shouldReroute(
  snapshot: TelemetrySnapshot,
  model: VehicleModel,
  chargers: Charger[],
  bearingDeg: number = 0
): RerouteResult {
  if (chargers.length === 0) return { reroute: false }

  const rangeKm = remainingRangeKm(snapshot, model)

  const nearestNow = getNearestCharger(snapshot, chargers)
  if (nearestNow && nearestNow.distanceKm <= REROUTE_PROXIMITY_KM && !nearestNow.charger.isOccupied) {
    return { reroute: false }
  }

  const projected = projectPosition(snapshot, bearingDeg, rangeKm)
  const nearestAtProjected = getNearestCharger(projected, chargers)

  if (nearestAtProjected && nearestAtProjected.distanceKm <= REROUTE_PROXIMITY_KM) {
    return { reroute: false }
  }

  const reachableUnoccupied = chargers
    .filter(c => !c.isOccupied && haversineKm(snapshot, c) <= rangeKm)
    .sort((a, b) => haversineKm(snapshot, a) - haversineKm(snapshot, b))

  if (reachableUnoccupied.length > 0) {
    return { reroute: true, targetChargerId: reachableUnoccupied[0].id }
  }

  const nearest = getNearestCharger(snapshot, chargers)
  return { reroute: true, targetChargerId: nearest?.charger.id }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run lib/fleet/__tests__/battery.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/fleet/battery.ts lib/fleet/__tests__/battery.test.ts
git commit -m "feat(fleet): add battery prediction logic — shouldReroute, classifyReadiness, scoreVehicle"
```

---

## Task 5: State Machine

**Files:**
- Create: `lib/fleet/state-machine.ts`
- Create: `lib/fleet/__tests__/state-machine.test.ts`

- [ ] **Step 1: Create `lib/fleet/__tests__/state-machine.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { canTransition, createDispatchEvent } from '../state-machine'

describe('canTransition', () => {
  it('allows IDLE → DISPATCHED', () => expect(canTransition('IDLE', 'DISPATCHED')).toBe(true))
  it('allows DISPATCHED → PATROLLING', () => expect(canTransition('DISPATCHED', 'PATROLLING')).toBe(true))
  it('allows PATROLLING → ROUTING_TO_CHARGER', () => expect(canTransition('PATROLLING', 'ROUTING_TO_CHARGER')).toBe(true))
  it('allows ROUTING_TO_CHARGER → CHARGING', () => expect(canTransition('ROUTING_TO_CHARGER', 'CHARGING')).toBe(true))
  it('allows CHARGING → PATROLLING', () => expect(canTransition('CHARGING', 'PATROLLING')).toBe(true))
  it('allows PATROLLING → IDLE (shift end)', () => expect(canTransition('PATROLLING', 'IDLE')).toBe(true))
  it('allows any → OFFLINE', () => {
    for (const s of ['IDLE', 'DISPATCHED', 'PATROLLING', 'ROUTING_TO_CHARGER', 'CHARGING'] as const) {
      expect(canTransition(s, 'OFFLINE')).toBe(true)
    }
  })
  it('allows OFFLINE → IDLE', () => expect(canTransition('OFFLINE', 'IDLE')).toBe(true))
  it('rejects IDLE → PATROLLING (skips DISPATCHED)', () => expect(canTransition('IDLE', 'PATROLLING')).toBe(false))
  it('rejects CHARGING → IDLE', () => expect(canTransition('CHARGING', 'IDLE')).toBe(false))
  it('rejects IDLE → CHARGING', () => expect(canTransition('IDLE', 'CHARGING')).toBe(false))
})

describe('createDispatchEvent', () => {
  it('returns a valid event for a legal transition', () => {
    const event = createDispatchEvent('v1', 'IDLE', 'DISPATCHED', 'DISPATCH', 'SYSTEM')
    expect(event.vehicleId).toBe('v1')
    expect(event.previousStatus).toBe('IDLE')
    expect(event.newStatus).toBe('DISPATCHED')
    expect(event.triggeredBy).toBe('SYSTEM')
    expect(event.action).toBe('DISPATCH')
    expect(event.id).toBeTruthy()
    expect(event.timestamp).toBeInstanceOf(Date)
  })

  it('accepts optional metadata', () => {
    const event = createDispatchEvent('v1', 'PATROLLING', 'ROUTING_TO_CHARGER', 'REROUTE_TO_CHARGER', 'SYSTEM', { chargerId: 'c1' })
    expect(event.metadata?.chargerId).toBe('c1')
  })

  it('throws for an invalid transition', () => {
    expect(() => createDispatchEvent('v1', 'IDLE', 'CHARGING', 'DISPATCH', 'SYSTEM')).toThrow('Invalid transition: IDLE → CHARGING')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run lib/fleet/__tests__/state-machine.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `lib/fleet/state-machine.ts`**

```ts
import type { VehicleStatus, DispatchEvent, DispatchAction } from './types'
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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run lib/fleet/__tests__/state-machine.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/fleet/state-machine.ts lib/fleet/__tests__/state-machine.test.ts
git commit -m "feat(fleet): add vehicle state machine with transition validation"
```

---

## Task 6: Shift Manager

**Files:**
- Create: `lib/fleet/shift-manager.ts`
- Create: `lib/fleet/__tests__/shift-manager.test.ts`

- [ ] **Step 1: Create `lib/fleet/__tests__/shift-manager.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { getCurrentShiftNumber, isShiftStarting, isShiftEnding, buildShiftTimes } from '../shift-manager'
import type { Shift } from '../types'

const makeShift = (overrides: Partial<Shift> = {}): Shift => ({
  id: 's1', shiftNumber: 1,
  startTime: new Date('2026-06-20T06:00:00'),
  endTime: new Date('2026-06-20T14:00:00'),
  vehicleId: 'v1', driverIds: ['d1', 'd2', 'd3'], status: 'SCHEDULED',
  ...overrides,
})

describe('getCurrentShiftNumber', () => {
  it('returns 1 at 06:00', () => expect(getCurrentShiftNumber(new Date('2026-06-20T06:00:00'))).toBe(1))
  it('returns 1 at 13:59', () => expect(getCurrentShiftNumber(new Date('2026-06-20T13:59:00'))).toBe(1))
  it('returns 2 at 14:00', () => expect(getCurrentShiftNumber(new Date('2026-06-20T14:00:00'))).toBe(2))
  it('returns 2 at 21:59', () => expect(getCurrentShiftNumber(new Date('2026-06-20T21:59:00'))).toBe(2))
  it('returns 3 at 22:00', () => expect(getCurrentShiftNumber(new Date('2026-06-20T22:00:00'))).toBe(3))
  it('returns 3 at 02:00 (crosses midnight)', () => expect(getCurrentShiftNumber(new Date('2026-06-21T02:00:00'))).toBe(3))
  it('returns 3 at 05:59 (just before shift 1)', () => expect(getCurrentShiftNumber(new Date('2026-06-20T05:59:00'))).toBe(3))
})

describe('isShiftStarting', () => {
  it('returns true when SCHEDULED and startTime has passed', () => {
    const shift = makeShift({ status: 'SCHEDULED', startTime: new Date('2026-06-20T06:00:00') })
    expect(isShiftStarting(shift, new Date('2026-06-20T06:01:00'))).toBe(true)
  })
  it('returns false when already ACTIVE', () => {
    const shift = makeShift({ status: 'ACTIVE', startTime: new Date('2026-06-20T06:00:00') })
    expect(isShiftStarting(shift, new Date('2026-06-20T06:01:00'))).toBe(false)
  })
  it('returns false when startTime is in the future', () => {
    const shift = makeShift({ status: 'SCHEDULED', startTime: new Date('2026-06-20T08:00:00') })
    expect(isShiftStarting(shift, new Date('2026-06-20T06:00:00'))).toBe(false)
  })
})

describe('isShiftEnding', () => {
  it('returns true when ACTIVE and endTime has passed', () => {
    const shift = makeShift({ status: 'ACTIVE', endTime: new Date('2026-06-20T14:00:00') })
    expect(isShiftEnding(shift, new Date('2026-06-20T14:01:00'))).toBe(true)
  })
  it('returns false when not ACTIVE', () => {
    const shift = makeShift({ status: 'SCHEDULED', endTime: new Date('2026-06-20T14:00:00') })
    expect(isShiftEnding(shift, new Date('2026-06-20T14:01:00'))).toBe(false)
  })
})

describe('buildShiftTimes', () => {
  it('builds correct times for shift 1', () => {
    const { startTime, endTime } = buildShiftTimes(1, new Date('2026-06-20'))
    expect(startTime.getHours()).toBe(6)
    expect(endTime.getHours()).toBe(14)
    expect(endTime.getDate()).toBe(startTime.getDate())
  })
  it('shift 3 end is next day', () => {
    const { startTime, endTime } = buildShiftTimes(3, new Date('2026-06-20'))
    expect(startTime.getHours()).toBe(22)
    expect(endTime.getHours()).toBe(6)
    expect(endTime.getDate()).toBe(startTime.getDate() + 1)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run lib/fleet/__tests__/shift-manager.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `lib/fleet/shift-manager.ts`**

```ts
import type { Shift } from './types'
import { SHIFT_SCHEDULE } from './constants'

export function getCurrentShiftNumber(now: Date = new Date()): 1 | 2 | 3 {
  const hour = now.getHours()
  for (const s of SHIFT_SCHEDULE) {
    if (s.startHour < s.endHour) {
      if (hour >= s.startHour && hour < s.endHour) return s.shiftNumber
    } else {
      if (hour >= s.startHour || hour < s.endHour) return s.shiftNumber
    }
  }
  return 1
}

export function isShiftStarting(shift: Shift, now: Date = new Date()): boolean {
  return shift.status === 'SCHEDULED' && shift.startTime <= now
}

export function isShiftEnding(shift: Shift, now: Date = new Date()): boolean {
  return shift.status === 'ACTIVE' && shift.endTime <= now
}

export function buildShiftTimes(
  shiftNumber: 1 | 2 | 3,
  date: Date
): { startTime: Date; endTime: Date } {
  const schedule = SHIFT_SCHEDULE.find(s => s.shiftNumber === shiftNumber)!
  const startTime = new Date(date)
  startTime.setHours(schedule.startHour, 0, 0, 0)
  const endTime = new Date(date)
  endTime.setHours(schedule.endHour, 0, 0, 0)
  if (schedule.startHour > schedule.endHour) {
    endTime.setDate(endTime.getDate() + 1)
  }
  return { startTime, endTime }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run lib/fleet/__tests__/shift-manager.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/fleet/shift-manager.ts lib/fleet/__tests__/shift-manager.test.ts
git commit -m "feat(fleet): add shift manager — timing detection and shift time builder"
```

---

## Task 7: Telemetry Adapters

**Files:**
- Create: `lib/fleet/adapters/telemetry-adapter.ts`
- Create: `lib/fleet/adapters/mock-telemetry-adapter.ts`
- Create: `lib/fleet/__tests__/mock-telemetry-adapter.test.ts`

- [ ] **Step 1: Create `lib/fleet/__tests__/mock-telemetry-adapter.test.ts`**

```ts
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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run lib/fleet/__tests__/mock-telemetry-adapter.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `lib/fleet/adapters/telemetry-adapter.ts`**

```ts
import type { TelemetrySnapshot } from '../types'

export interface TelemetryAdapter {
  getSnapshot(vehicleId: string): Promise<TelemetrySnapshot>
  getAllSnapshots(): Promise<TelemetrySnapshot[]>
  subscribe?(vehicleId: string, callback: (snapshot: TelemetrySnapshot) => void): () => void
}
```

- [ ] **Step 4: Create `lib/fleet/adapters/mock-telemetry-adapter.ts`**

```ts
import type { TelemetryAdapter } from './telemetry-adapter'
import type { TelemetrySnapshot } from '../types'

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
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run lib/fleet/__tests__/mock-telemetry-adapter.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/fleet/adapters/ lib/fleet/__tests__/mock-telemetry-adapter.test.ts
git commit -m "feat(fleet): add TelemetryAdapter interface and MockTelemetryAdapter"
```

---

## Task 8: Dispatch Engine

**Files:**
- Create: `lib/fleet/dispatch-engine.ts`
- Create: `lib/fleet/__tests__/dispatch-engine.test.ts`

- [ ] **Step 1: Create `lib/fleet/__tests__/dispatch-engine.test.ts`**

```ts
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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run lib/fleet/__tests__/dispatch-engine.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `lib/fleet/dispatch-engine.ts`**

```ts
import type { Vehicle, Charger, Shift, Coords, ScoredVehicle } from './types'
import type { TelemetryAdapter } from './adapters/telemetry-adapter'
import type { FleetRepository } from './fleet-repository'
import { shouldReroute, classifyReadiness, scoreVehicle } from './battery'
import { createDispatchEvent } from './state-machine'
import { isShiftStarting, isShiftEnding } from './shift-manager'

export class DispatchEngine {
  constructor(
    private telemetry: TelemetryAdapter,
    private repo: FleetRepository,
    private patrolStartCoords: Coords
  ) {}

  async evaluateFleet(): Promise<void> {
    const [vehicles, chargers, shifts] = await Promise.all([
      this.repo.getActiveVehicles(),
      this.repo.getChargers(),
      this.repo.getActiveShifts(),
    ])
    // Sequenced — not parallel — to prevent write/write race on vehicle status
    await this.evaluatePatrollingVehicles(vehicles, chargers)
    await this.evaluateShifts(shifts)
  }

  private async evaluatePatrollingVehicles(vehicles: Vehicle[], chargers: Charger[]): Promise<void> {
    const patrolling = vehicles.filter(v => v.status === 'PATROLLING')
    await Promise.all(patrolling.map(async (vehicle) => {
      const snapshot = await this.telemetry.getSnapshot(vehicle.id)
      const result = shouldReroute(snapshot, vehicle.model, chargers, snapshot.bearingDeg ?? 0)

      if (!result.reroute) return

      if (!result.targetChargerId) {
        await this.repo.notifyDispatcher(
          `CRITICAL: Vehicle ${vehicle.id} has no reachable charger`,
          { vehicleId: vehicle.id, batteryPercent: snapshot.batteryPercent }
        )
        return
      }

      const event = createDispatchEvent(
        vehicle.id, 'PATROLLING', 'ROUTING_TO_CHARGER',
        'REROUTE_TO_CHARGER', 'SYSTEM',
        { targetChargerId: result.targetChargerId }
      )
      await Promise.all([
        this.repo.updateVehicleStatus(vehicle.id, 'ROUTING_TO_CHARGER', result.targetChargerId),
        this.repo.saveDispatchEvent(event),
      ])
    }))
  }

  private async evaluateShifts(shifts: Shift[]): Promise<void> {
    const now = new Date()
    await Promise.all(shifts.map(async (shift) => {
      try {
        if (isShiftStarting(shift, now)) return await this.startShift(shift)
        if (isShiftEnding(shift, now))   return await this.endShift(shift)
      } catch (err) {
        this.repo.notifyDispatcher(
          `Shift ${shift.id} evaluation failed: ${err instanceof Error ? err.message : String(err)}`,
          { shiftId: shift.id }
        ).catch(() => { /* notification failure is non-fatal */ })
      }
    }))
  }

  private async startShift(shift: Shift): Promise<void> {
    const [snapshot, vehicle] = await Promise.all([
      this.telemetry.getSnapshot(shift.vehicleId),
      this.repo.getVehicle(shift.vehicleId),
    ])

    if (vehicle.status !== 'IDLE') {
      await this.repo.notifyDispatcher(
        `Shift ${shift.id} vehicle ${shift.vehicleId} cannot be dispatched — current status: ${vehicle.status}`,
        { shiftId: shift.id, vehicleId: shift.vehicleId, actualStatus: vehicle.status }
      )
      return
    }

    const readiness = classifyReadiness(snapshot.batteryPercent)
    if (readiness === 'NOT_READY') {
      await this.repo.notifyDispatcher(
        `Shift ${shift.id} vehicle ${shift.vehicleId} is NOT_READY at shift start`,
        { shiftId: shift.id, vehicleId: shift.vehicleId, batteryPercent: snapshot.batteryPercent }
      )
      return
    }

    const event = createDispatchEvent(
      shift.vehicleId, 'IDLE', 'DISPATCHED', 'DISPATCH', 'SYSTEM', { shiftId: shift.id }
    )
    await Promise.all([
      this.repo.updateVehicleStatus(shift.vehicleId, 'DISPATCHED', undefined),
      this.repo.saveDispatchEvent(event),
      this.repo.updateShiftStatus(shift.id, 'ACTIVE'),
    ])
  }

  private async endShift(shift: Shift): Promise<void> {
    const vehicle = await this.repo.getVehicle(shift.vehicleId)

    if (vehicle.status === 'IDLE') {
      await this.repo.updateShiftStatus(shift.id, 'COMPLETED')
      return
    }

    if (vehicle.status === 'CHARGING' || vehicle.status === 'ROUTING_TO_CHARGER') {
      await Promise.all([
        this.repo.updateShiftStatus(shift.id, 'COMPLETED'),
        this.repo.notifyDispatcher(
          `Shift ${shift.id} ended while vehicle ${vehicle.id} is ${vehicle.status} — vehicle returns to IDLE after charge completes`,
          { shiftId: shift.id, vehicleId: vehicle.id }
        ),
      ])
      return
    }

    const event = createDispatchEvent(
      shift.vehicleId, vehicle.status, 'IDLE', 'DISPATCH', 'SYSTEM',
      { shiftId: shift.id, reason: 'shift_end' }
    )
    await Promise.all([
      this.repo.updateVehicleStatus(shift.vehicleId, 'IDLE'),
      this.repo.saveDispatchEvent(event),
      this.repo.updateShiftStatus(shift.id, 'COMPLETED'),
    ])
  }

  async selectVehicleForDispatch(): Promise<ScoredVehicle | null> {
    const idleVehicles = await this.repo.getIdleVehicles()
    if (idleVehicles.length === 0) return null

    const snapshots = await Promise.all(idleVehicles.map(v => this.telemetry.getSnapshot(v.id)))

    const scored: ScoredVehicle[] = snapshots.map((snapshot, i) => ({
      vehicleId: idleVehicles[i].id,
      score:     scoreVehicle(snapshot, this.patrolStartCoords),
      readiness: classifyReadiness(snapshot.batteryPercent),
      snapshot,
    }))

    const eligible = scored.filter(s => s.readiness !== 'NOT_READY')
    if (eligible.length === 0) {
      await this.repo.notifyDispatcher(
        'coverage gap: no vehicles above minimum battery threshold',
        { vehicleIds: scored.map(s => s.vehicleId) }
      )
      return null
    }

    return eligible.sort((a, b) => b.score - a.score)[0]
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run lib/fleet/__tests__/dispatch-engine.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Run full fleet test suite**

```bash
npx vitest run lib/fleet/
```

Expected: all tests in all 6 fleet test files pass.

- [ ] **Step 6: Commit**

```bash
git add lib/fleet/dispatch-engine.ts lib/fleet/__tests__/dispatch-engine.test.ts
git commit -m "feat(fleet): add DispatchEngine orchestrator with shift and reroute handling"
```

---

## Task 9: SupabaseFleetRepository (Adapted)

**Files:**
- Create: `lib/fleet/supabase-fleet-repository.ts`

Three changes from the Trip Planner original: table name `chargers→charging_stations`, column name `plate_number→plate_no`, active filter on `getChargers()`.

- [ ] **Step 1: Create `lib/fleet/supabase-fleet-repository.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FleetRepository } from './fleet-repository'
import type { Vehicle, Charger, Shift, DispatchEvent } from './types'

function toVehicle(row: Record<string, unknown>): Vehicle {
  return {
    id:                row.id as string,
    model:             row.model as Vehicle['model'],
    plateNumber:       row.plate_no as string,        // evecosys uses plate_no
    status:            row.status as Vehicle['status'],
    currentShiftId:    row.current_shift_id as string | null,
    assignedChargerId: row.assigned_charger_id as string | null,
  }
}

function toCharger(row: Record<string, unknown>): Charger {
  return {
    id:         row.id as string,
    latitude:   row.latitude as number,
    longitude:  row.longitude as number,
    type:       row.type as Charger['type'],
    isOccupied: row.is_occupied as boolean,
  }
}

function toShift(row: Record<string, unknown>): Shift {
  return {
    id:          row.id as string,
    shiftNumber: row.shift_number as 1 | 2 | 3,
    startTime:   new Date(row.start_time as string),
    endTime:     new Date(row.end_time as string),
    vehicleId:   row.vehicle_id as string,
    driverIds:   row.driver_ids as string[],
    status:      row.status as Shift['status'],
  }
}

export class SupabaseFleetRepository implements FleetRepository {
  constructor(private client: SupabaseClient) {}

  async getVehicle(vehicleId: string): Promise<Vehicle> {
    const { data, error } = await this.client
      .from('vehicles').select('*').eq('id', vehicleId).single()
    if (error) throw new Error(`getVehicle: ${error.message}`)
    return toVehicle(data)
  }

  async getActiveVehicles(): Promise<Vehicle[]> {
    const { data, error } = await this.client
      .from('vehicles').select('*')
      .not('status', 'in', '("IDLE","OFFLINE")')
    if (error) throw new Error(`getActiveVehicles: ${error.message}`)
    return (data ?? []).map(toVehicle)
  }

  async getIdleVehicles(): Promise<Vehicle[]> {
    const { data, error } = await this.client
      .from('vehicles').select('*').eq('status', 'IDLE')
    if (error) throw new Error(`getIdleVehicles: ${error.message}`)
    return (data ?? []).map(toVehicle)
  }

  async getActiveShifts(): Promise<Shift[]> {
    const { data, error } = await this.client
      .from('shifts').select('*')
      .in('status', ['SCHEDULED', 'ACTIVE'])
    if (error) throw new Error(`getActiveShifts: ${error.message}`)
    return (data ?? []).map(toShift)
  }

  async getChargers(): Promise<Charger[]> {
    // Only return active stations with coordinates — inactive or uncoordinated stations
    // cannot be used for dispatch routing.
    const { data, error } = await this.client
      .from('charging_stations')        // evecosys table name
      .select('*')
      .eq('is_active', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
    if (error) throw new Error(`getChargers: ${error.message}`)
    return (data ?? []).map(toCharger)
  }

  async updateVehicleStatus(
    vehicleId: string,
    status: Vehicle['status'],
    assignedChargerId?: string | null
  ): Promise<void> {
    const update: Record<string, unknown> = { status }
    if (assignedChargerId !== undefined) update.assigned_charger_id = assignedChargerId
    const { error } = await this.client.from('vehicles').update(update).eq('id', vehicleId)
    if (error) throw new Error(`updateVehicleStatus: ${error.message}`)
  }

  async updateShiftStatus(shiftId: string, status: Shift['status']): Promise<void> {
    const { error } = await this.client.from('shifts').update({ status }).eq('id', shiftId)
    if (error) throw new Error(`updateShiftStatus: ${error.message}`)
  }

  async saveDispatchEvent(event: DispatchEvent): Promise<void> {
    const { error } = await this.client.from('dispatch_events').insert({
      id:              event.id,
      vehicle_id:      event.vehicleId,
      triggered_by:    event.triggeredBy,
      action:          event.action,
      previous_status: event.previousStatus,
      new_status:      event.newStatus,
      metadata:        event.metadata ?? null,
    })
    if (error) throw new Error(`saveDispatchEvent: ${error.message}`)
  }

  async notifyDispatcher(message: string, metadata?: Record<string, unknown>): Promise<void> {
    // Prototype: log to console. Replace with push/email/dashboard alert when ready.
    console.warn('[FleetDispatch] DISPATCHER ALERT:', message, metadata)
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
make typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/fleet/supabase-fleet-repository.ts
git commit -m "feat(fleet): add SupabaseFleetRepository adapted for evecosys schema"
```

---

## Task 10: Fleet Evaluate API Route

**Files:**
- Create: `app/api/fleet/evaluate/route.ts`
- Modify: `.env.local`

The evaluate endpoint is a system-level operation (bypasses RLS), so it uses `createServiceClient` from `@/lib/supabase/service`, not the user-session client.

- [ ] **Step 1: Add patrol coordinates to `.env.local`**

Open `.env.local` and add these two lines (adjust coordinates to the actual highway patrol start point):

```
PATROL_START_LAT=14.5995
PATROL_START_LNG=120.9842
```

- [ ] **Step 2: Create `app/api/fleet/evaluate/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { DispatchEngine } from '@/lib/fleet/dispatch-engine'
import { MockTelemetryAdapter } from '@/lib/fleet/adapters/mock-telemetry-adapter'
import { SupabaseFleetRepository } from '@/lib/fleet/supabase-fleet-repository'
import { createServiceClient } from '@/lib/supabase/service'

const PATROL_START_COORDS = {
  latitude:  Number(process.env.PATROL_START_LAT),
  longitude: Number(process.env.PATROL_START_LNG),
}

export async function POST() {
  try {
    const supabase  = createServiceClient()
    const repo      = new SupabaseFleetRepository(supabase)
    const telemetry = new MockTelemetryAdapter()
    const engine    = new DispatchEngine(telemetry, repo, PATROL_START_COORDS)

    await engine.evaluateFleet()

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[fleet/evaluate]', message)
    return NextResponse.json({ error: 'Fleet evaluation failed', detail: message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
make typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/fleet/evaluate/route.ts .env.local
git commit -m "feat(fleet): add fleet evaluate API route — POST /api/fleet/evaluate"
```

---

## Task 11: Update App Types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Update `Vehicle` and `ChargingStation` in `types/index.ts`**

Replace the `Vehicle` interface (lines 15–31) with:

```ts
export interface Vehicle {
  id: string
  brand: string
  model: string
  plate_no: string
  soc: number
  soh: number
  status: 'IDLE' | 'DISPATCHED' | 'PATROLLING' | 'ROUTING_TO_CHARGER' | 'CHARGING' | 'OFFLINE'
  location_name: string
  location_detail: string
  coordinates: string
  odometer: number
  year: number
  color?: string
  current_shift_id?: string | null
  assigned_charger_id?: string | null
  created_at: string
}
```

Replace the `ChargingStation` interface (lines 71–80) with:

```ts
export interface ChargingStation {
  id: string
  name: string
  address: string
  coordinates: string
  connector_type: string
  power_kw: number
  is_active: boolean
  installed_at: string
  latitude?: number
  longitude?: number
  type?: 'DEPOT' | 'HIGHWAY'
  is_occupied?: boolean
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
make typecheck
```

Expected: errors will appear in components and pages that reference old status values — these are fixed in Tasks 12–14.

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat(types): update Vehicle.status to dispatch statuses, add dispatch fields to ChargingStation"
```

---

## Task 12: Update Fleet Health Logic and Its Test

**Files:**
- Modify: `lib/fleetHealth.ts`
- Modify: `test/unit/lib/fleetHealth.test.ts`

`Maintenance` → `OFFLINE` in availability calculation. The test fixture also uses old status values.

- [ ] **Step 1: Update `lib/fleetHealth.ts`**

In `lib/fleetHealth.ts`, change line 25:

```ts
// Before:
const available = vehicles.filter(v => v.status !== 'Maintenance').length

// After:
const available = vehicles.filter(v => v.status !== 'OFFLINE').length
```

- [ ] **Step 2: Update `test/unit/lib/fleetHealth.test.ts`**

The `vehicle()` fixture and all test cases that reference old status values need updating. Replace the entire file:

```ts
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
```

- [ ] **Step 3: Run the fleet health tests**

```bash
npx vitest run test/unit/lib/fleetHealth.test.ts
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/fleetHealth.ts test/unit/lib/fleetHealth.test.ts
git commit -m "fix(fleetHealth): update availability check from Maintenance to OFFLINE status"
```

---

## Task 13: Update Board Page

**Files:**
- Modify: `app/(dashboard)/board/page.tsx`

Two changes: `statusCounts` shape uses new status keys, and the `online` calculation uses `OFFLINE` instead of `Maintenance`.

- [ ] **Step 1: Update `app/(dashboard)/board/page.tsx`**

Find line 33:
```ts
// Before:
const online = vList.filter(v => v.status !== 'Maintenance').length
// After:
const online = vList.filter(v => v.status !== 'OFFLINE').length
```

Find lines 53–54:
```ts
// Before:
const statusCounts = { Moving: 0, Parked: 0, Charging: 0, Maintenance: 0 }
// After:
const statusCounts = { IDLE: 0, DISPATCHED: 0, PATROLLING: 0, ROUTING_TO_CHARGER: 0, CHARGING: 0, OFFLINE: 0 }
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
make typecheck
```

Expected: errors will appear in `BoardTabsClient.tsx` about the `statusCounts` type mismatch — fixed in Task 14.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/board/page.tsx"
git commit -m "fix(board): update statusCounts and online calculation to new vehicle statuses"
```

---

## Task 14: Update UI Components

**Files:**
- Modify: `components/manager/VehicleDrawer.tsx`
- Modify: `components/manager/AssetManagementClient.tsx`
- Modify: `components/board/BoardTabsClient.tsx`
- Modify: `components/manager/DriversClient.tsx`

- [ ] **Step 1: Update `components/manager/VehicleDrawer.tsx`**

Replace lines 16–21 (the `statusVariant` function):

```ts
// Before:
function statusVariant(s: string): 'green' | 'amber' | 'red' | 'teal' {
  if (s === 'Moving') return 'green'
  if (s === 'Parked') return 'amber'
  if (s === 'Maintenance') return 'red'
  return 'teal'
}

// After:
function statusVariant(s: string): 'green' | 'amber' | 'red' | 'teal' | 'blue' {
  if (s === 'PATROLLING') return 'green'
  if (s === 'IDLE') return 'amber'
  if (s === 'OFFLINE') return 'red'
  if (s === 'DISPATCHED') return 'blue'
  if (s === 'CHARGING') return 'teal'
  return 'amber'
}
```

- [ ] **Step 2: Update `components/manager/AssetManagementClient.tsx`**

Replace lines 14–19 (`statusVariant`) and line 36 (`statuses` array):

```ts
// statusVariant — replace lines 14–19:
function statusVariant(s: string): 'green' | 'amber' | 'red' | 'teal' | 'blue' {
  if (s === 'PATROLLING') return 'green'
  if (s === 'IDLE') return 'amber'
  if (s === 'OFFLINE') return 'red'
  if (s === 'DISPATCHED') return 'blue'
  if (s === 'CHARGING') return 'teal'
  return 'amber'
}

// statuses array — replace line 36:
// Before:
const statuses = ['all', 'Moving', 'Parked', 'Charging', 'Maintenance']
// After:
const statuses = ['all', 'IDLE', 'DISPATCHED', 'PATROLLING', 'ROUTING_TO_CHARGER', 'CHARGING', 'OFFLINE']
```

- [ ] **Step 3: Update `components/board/BoardTabsClient.tsx`**

Three changes in this file:

**3a.** Replace line 116 (`statusCounts` type in `BoardData`):
```ts
// Before:
statusCounts: { Moving: number; Parked: number; Charging: number; Maintenance: number }
// After:
statusCounts: { IDLE: number; DISPATCHED: number; PATROLLING: number; ROUTING_TO_CHARGER: number; CHARGING: number; OFFLINE: number }
```

**3b.** Replace lines 290–292 (`statusColors` map in `FleetTab`):
```ts
// Before:
const statusColors: Record<string, string> = {
  Moving: '#7cc242', Parked: '#1a7080', Charging: '#c07800', Maintenance: '#c02020',
}
// After:
const statusColors: Record<string, string> = {
  IDLE: '#c07800', DISPATCHED: '#1a7080', PATROLLING: '#7cc242',
  ROUTING_TO_CHARGER: '#d06000', CHARGING: '#1a9080', OFFLINE: '#c02020',
}
```

**3c.** Replace line 310 (status cards loop):
```ts
// Before:
{(['Moving', 'Parked', 'Charging', 'Maintenance'] as const).map(s => (
// After:
{(['IDLE', 'DISPATCHED', 'PATROLLING', 'ROUTING_TO_CHARGER', 'CHARGING', 'OFFLINE'] as const).map(s => (
```

**3d.** Replace line 242 (vehicle dot color in brand map):
```ts
// Before:
style={{ background: v.status === 'Moving' ? '#7cc242' : v.status === 'Maintenance' ? '#c02020' : '#c07800' }}
// After:
style={{ background: v.status === 'PATROLLING' ? '#7cc242' : v.status === 'OFFLINE' ? '#c02020' : '#c07800' }}
```

- [ ] **Step 4: Update `components/manager/DriversClient.tsx`**

Replace line 136 (inline status badge):
```ts
// Before:
<Badge variant={d.vehicle.status === 'Moving' ? 'green' : 'amber'} dot>
// After:
<Badge variant={d.vehicle.status === 'PATROLLING' ? 'green' : 'amber'} dot>
```

- [ ] **Step 5: Verify TypeScript compiles with no errors**

```bash
make typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/manager/VehicleDrawer.tsx components/manager/AssetManagementClient.tsx components/board/BoardTabsClient.tsx components/manager/DriversClient.tsx
git commit -m "fix(ui): update vehicle status display — Moving/Parked/Maintenance → dispatch statuses"
```

---

## Task 15: Full Test Suite Verification

- [ ] **Step 1: Run the complete test suite**

```bash
make test
```

Expected: all tests pass — both the existing evecosys tests and the new fleet tests.

If any fleet test fails, check that `vitest.config.mts` does not exclude `lib/fleet/`. The existing config excludes only `node_modules/**` and `e2e/**`, so fleet tests are automatically included.

- [ ] **Step 2: Run typecheck**

```bash
make typecheck
```

Expected: no TypeScript errors.

- [ ] **Step 3: Run lint**

```bash
make lint
```

Expected: no lint errors.

---

## Task 16: Cleanup

- [ ] **Step 1: Delete the Trip Planner folder**

The `Trip Planner/` folder is a separate git repository — it has its own `.git/` inside. Delete it entirely:

```bash
rm -rf "Trip Planner/"
```

On Windows PowerShell:
```powershell
Remove-Item -Recurse -Force "Trip Planner"
```

- [ ] **Step 2: Verify the folder is gone**

```bash
git status
```

Expected: `Trip Planner/` no longer appears in untracked files.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove Trip Planner standalone folder — code integrated into evecosys"
```

---

## Done

After all 16 tasks:
- Fleet dispatch engine lives at `lib/fleet/` with 6 passing test files
- `POST /api/fleet/evaluate` triggers fleet evaluation (uses service-role client, bypasses RLS)
- DB has `shifts`, `dispatch_events` tables; `vehicles` and `charging_stations` are extended
- All existing UI displays vehicle statuses with new dispatch values

**Not in scope (deferred):**
- RLS policies for `shifts` and `dispatch_events`
- Cron setup for the evaluate endpoint (Vercel Cron or Supabase Edge Function scheduler)
- Seeding vehicles/chargers with real coordinates
- Replacing `MockTelemetryAdapter` with a real telematics adapter
- Replacing `console.warn` in `notifyDispatcher` with a real notification system
