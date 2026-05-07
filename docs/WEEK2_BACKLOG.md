# EVEcosys — Week 2 Backlog

> These features are explicitly out of scope for Week 1. Do not build until Week 2 sprint begins.

---

## Priority Matrix

| # | Feature | Priority | Effort | Depends On |
|---|---|---|---|---|
| 1 | Real-time SOC/SOH | High | Medium | Telematics hardware |
| 2 | Live map + route optimization | High | High | Google Maps API key |
| 3 | PDF export (trips, carbon reports) | Medium | Medium | Nothing |
| 4 | Telematics hardware integration | High | High | Hardware vendor API |
| 5 | Lighthouse performance audit fixes | Medium | Low | Production deployment |

---

## Feature Specifications

### 1. Real-time SOC/SOH
**What:** Live State of Charge (SOC) and State of Health (SOH) per vehicle, updating in real-time on the dashboard.

**How:**
- Supabase Realtime subscriptions on the `vehicles` table
- SOC/SOH columns to be added to `vehicles` table
- Driver and Manager dashboards subscribe to their relevant vehicle(s)

**Acceptance Criteria:**
- [ ] SOC updates reflect within 3 seconds of hardware push
- [ ] Manager sees all vehicles' SOC/SOH
- [ ] Driver sees only their assigned vehicle's SOC/SOH
- [ ] Graceful fallback UI when data is stale (>5 min old)

---

### 2. Live Map + Route Optimization
**What:** Interactive map showing vehicle locations and optimized routes per trip.

**How:**
- Google Maps JavaScript API
- `trips` table to store waypoints as JSONB
- Route optimization via Google Maps Directions API
- Map visible to Manager (all vehicles) and Driver (own vehicle)

**Acceptance Criteria:**
- [ ] Live vehicle pins on map update every 30 seconds
- [ ] Manager can view all vehicles on single map
- [ ] Driver sees own route with turn-by-turn waypoints
- [ ] Map respects dark/light mode

**Prerequisites:**
- Google Maps API key (billing enabled)
- Telematics hardware pushing GPS coordinates to Supabase

---

### 3. PDF Export
**What:** Exportable PDF reports for trips and carbon savings.

**How:**
- `react-pdf` or `@react-pdf/renderer` library
- Trip report: date range, distance, energy used, driver, vehicle
- Carbon report: CO2 saved vs equivalent ICE vehicle
- Export triggered from Manager and Driver dashboards

**Acceptance Criteria:**
- [ ] Manager can export trips for any vehicle/driver/date range
- [ ] Driver can export own trips only
- [ ] Carbon report calculates savings based on distance + vehicle efficiency
- [ ] PDF renders correctly on mobile and desktop

---

### 4. Telematics Hardware Integration
**What:** Real-time data pipeline from EV hardware to Supabase.

**How:**
- Hardware vendor webhook or MQTT → Supabase Edge Function
- Edge Function validates payload and upserts `vehicles` table (SOC, SOH, GPS, odometer)
- API key authentication on Edge Function endpoint

**Acceptance Criteria:**
- [ ] Edge Function authenticates hardware requests via API key
- [ ] Malformed payloads are rejected with 400 response
- [ ] Data pipeline latency < 5 seconds end-to-end
- [ ] Hardware vendor and model documented

**Prerequisites:**
- Hardware vendor selected and API docs obtained
- `HARDWARE_API_KEY` env var added to Vercel and Supabase

---

### 5. Lighthouse Performance Audit Fixes
**What:** Address any performance, accessibility, or SEO issues surfaced by Lighthouse on production.

**How:**
- Run Lighthouse audit on `https://evecosys.vercel.app` post-deployment
- Prioritise fixes scoring below 90 in Performance or Accessibility
- Common fixes: image optimisation, font loading, aria labels, meta tags

**Acceptance Criteria:**
- [ ] Lighthouse Performance score ≥ 90
- [ ] Lighthouse Accessibility score ≥ 90
- [ ] Lighthouse Best Practices score ≥ 90
- [ ] Lighthouse SEO score ≥ 90

---

## Environment Variables Needed in Week 2

| Key | Used By | Where to Add |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Live map | Vercel + `.env.local` |
| `HARDWARE_API_KEY` | Telematics Edge Function | Supabase Edge Function secrets |

---

## Database Changes Needed in Week 2

| Table | Change | Reason |
|---|---|---|
| `vehicles` | Add `soc NUMERIC`, `soh NUMERIC`, `lat NUMERIC`, `lng NUMERIC`, `last_telemetry_at TIMESTAMPTZ` | Real-time SOC/SOH + map |
| `trips` | Add `waypoints JSONB` | Route optimization |

> ⚠️ All schema changes must include RLS policy updates. Do not alter tables without reviewing existing RLS policies first.

---

## Definition of Done (Week 2)

A feature is only considered complete when:
1. Code is reviewed and merged to `main`
2. All acceptance criteria above are checked off
3. Smoke tested on production URL
4. README.md updated to reflect new features
5. No new Lighthouse regressions introduced
