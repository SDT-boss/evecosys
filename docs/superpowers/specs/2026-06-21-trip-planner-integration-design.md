# Trip Planner Integration — Design Spec
**Date:** 2026-06-21
**Status:** Approved
**Branch:** feature/eve-120-design-trip-planning-system-architecture
**Scope:** Integrate the standalone EV Fleet Trip Planner module into the evecosys Next.js app

---

## Context

A completed fleet dispatch module exists as a standalone TypeScript project in `Trip Planner/` (a separate git repo inside the evecosys working directory). It implements:
- Vehicle state machine (IDLE → DISPATCHED → PATROLLING → ROUTING_TO_CHARGER → CHARGING → OFFLINE)
- Battery prediction and charger reroute logic
- 3-shift daily schedule management
- A `DispatchEngine` orchestrator with a `TelemetryAdapter` abstraction (mock now, real telematics later)
- Full Vitest unit test suite

The module was built to be plugged into evecosys. This spec covers the integration.

`Trip Planner/Maple/` is a Claude Code workflow workspace template — not app code. It is deleted alongside the Trip Planner folder after integration.

---

## Section 1: Architecture & File Placement

The Trip Planner's `src/` prefix is removed — evecosys has no `src/` layer. Code lands at:

```
lib/fleet/
  types.ts                        ← dispatch domain types
  constants.ts                    ← vehicle specs, thresholds, shift schedule
  geo.ts                          ← haversine, projectPosition, getNearestCharger
  battery.ts                      ← shouldReroute, classifyReadiness, scoreVehicle
  state-machine.ts                ← canTransition, createDispatchEvent
  shift-manager.ts                ← shift timing helpers
  fleet-repository.ts             ← FleetRepository interface
  dispatch-engine.ts              ← DispatchEngine orchestrator
  supabase-fleet-repository.ts    ← Supabase impl, adapted for evecosys schema
  adapters/
    telemetry-adapter.ts          ← TelemetryAdapter interface
    mock-telemetry-adapter.ts     ← prototype implementation
  __tests__/                      ← 6 test files, collocated, picked up by vitest.config.mts
    geo.test.ts
    battery.test.ts
    state-machine.test.ts
    shift-manager.test.ts
    mock-telemetry-adapter.test.ts
    dispatch-engine.test.ts

app/api/fleet/evaluate/
  route.ts                        ← POST endpoint, imports from @/lib/supabase/server
```

### Two Vehicle types coexist intentionally

| Type | Location | Purpose |
|---|---|---|
| `Vehicle` | `types/index.ts` | Full asset management shape — used by all existing UI pages and components |
| `Vehicle` (fleet) | `lib/fleet/types.ts` | Dispatch subset — used only by the dispatch engine and repository |

The fleet module manages its own types internally. The `SupabaseFleetRepository` queries the same `vehicles` table but maps only the columns it needs.

---

## Section 2: Database Migration

**File:** `supabase/migrations/20260621000000_fleet_integration.sql`

Migration order is constrained by foreign keys: alter `charging_stations` first, then create `shifts`, then create `dispatch_events`, then alter `vehicles` (which FKs to both `shifts` and `charging_stations`).

### `vehicles` table

- Drop existing `status` check constraint (`Moving`, `Parked`, `Charging`, `Maintenance`)
- Data migration:
  - `Moving` → `PATROLLING`
  - `Parked` → `IDLE`
  - `Charging` → `CHARGING`
  - `Maintenance` → `OFFLINE`
- Add new check constraint: `('IDLE','DISPATCHED','PATROLLING','ROUTING_TO_CHARGER','CHARGING','OFFLINE')`
- Add `current_shift_id UUID NULL` — FK to `shifts(id)` added after shifts table is created
- Add `assigned_charger_id UUID NULL REFERENCES charging_stations(id) ON DELETE SET NULL`

### `charging_stations` table

Add dispatch columns (nullable so existing rows are unaffected):
- `latitude FLOAT8 NULL`
- `longitude FLOAT8 NULL`
- `type TEXT NULL CHECK (type IN ('DEPOT', 'HIGHWAY'))`
- `is_occupied BOOLEAN NOT NULL DEFAULT FALSE`

### New tables

**`shifts`**
```sql
id            uuid primary key
shift_number  int  check (shift_number in (1, 2, 3))
start_time    timestamptz
end_time      timestamptz
vehicle_id    uuid references vehicles(id) on delete restrict
driver_ids    uuid[] default '{}'
status        text check (status in ('SCHEDULED','ACTIVE','COMPLETED'))
created_at    timestamptz default now()
```

**`dispatch_events`**
```sql
id              uuid primary key
vehicle_id      uuid references vehicles(id) on delete cascade
triggered_by    text check (triggered_by in ('SYSTEM','DISPATCHER'))
action          text check (action in ('DISPATCH','REROUTE_TO_CHARGER','RETURN_TO_PATROL','OVERRIDE'))
previous_status text
new_status      text
metadata        jsonb
created_at      timestamptz default now()
```

Indexes: `vehicles(status)`, `shifts(status)`, `shifts(vehicle_id)`, `dispatch_events(vehicle_id)`, `dispatch_events(created_at desc)`.

---

## Section 3: Repository Adaptation

`supabase-fleet-repository.ts` requires three targeted changes from the Trip Planner original:

1. **Table name** — `chargers` → `charging_stations`
2. **Column name** — `plate_number` → `plate_no` in `toVehicle()`
3. **Active filter** — `getChargers()` adds `.eq('is_active', true)` so decommissioned stations are excluded from dispatch routing decisions

Everything else (query patterns, row mappers, dispatch event writes) is identical to the original.

The `toCharger()` mapper reads the new `latitude`, `longitude`, `type`, `is_occupied` columns added to `charging_stations`.

---

## Section 4: Type & UI Updates

### `types/index.ts`

**`Vehicle`** — update status union and add dispatch fields:
```ts
status: 'IDLE' | 'DISPATCHED' | 'PATROLLING' | 'ROUTING_TO_CHARGER' | 'CHARGING' | 'OFFLINE'
current_shift_id?: string | null
assigned_charger_id?: string | null
```

**`ChargingStation`** — add optional dispatch fields (optional because existing rows won't have coordinates until manually populated):
```ts
latitude?: number
longitude?: number
type?: 'DEPOT' | 'HIGHWAY'
is_occupied?: boolean
```

### UI components (4 files)

All changes are confined to status display logic — no structural changes.

| Component | What changes |
|---|---|
| `components/manager/VehicleDrawer.tsx` | `statusVariant()` function |
| `components/manager/AssetManagementClient.tsx` | `statusVariant()` + status filter array |
| `components/board/BoardTabsClient.tsx` | `statusCounts` type + color map |
| `components/manager/DriversClient.tsx` | Inline status badge condition |

New status → color/variant mapping:
```
IDLE              → amber
DISPATCHED        → blue
PATROLLING        → green
ROUTING_TO_CHARGER → orange
CHARGING          → teal
OFFLINE           → red
```

---

## Section 5: Tests, Env Vars & Cleanup

### Tests
- 6 fleet test files land in `lib/fleet/__tests__/`
- No vitest config changes needed — `vitest.config.mts` already aliases `@` to project root and excludes `node_modules` / `e2e`
- `jsdom` environment is compatible with the pure-logic fleet tests

### Environment variables
Add to `.env.local`:
```
PATROL_START_LAT=<highway patrol zone entry latitude>
PATROL_START_LNG=<highway patrol zone entry longitude>
```
Values are client-specific; update before running the evaluate endpoint.

### Cleanup
- Delete `Trip Planner/` folder entirely (separate git repo — `rm -rf`)
- `Maple/` is deleted with it (Claude Code workflow tool, not app code)

---

## Out of scope

The following are explicitly deferred (documented in the original Trip Planner design):
- Road-network position projection (currently straight-line haversine)
- Real telematics adapter (`TelematicsDeviceAdapter`) — swap in when device SDK is ready
- Dispatcher notification system (currently `console.warn` in `notifyDispatcher`)
- Cron setup for `POST /api/fleet/evaluate` (Vercel Cron or equivalent)
- Seeding vehicles/chargers with coordinates in Supabase
- RLS policies for `shifts` and `dispatch_events` tables
