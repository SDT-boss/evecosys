-- ══════════════════════════════════════════════════════
-- EVEcosys Fleet Management — Supabase SQL Schema
-- Run this in your Supabase SQL Editor (dashboard.supabase.com)
-- ══════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- 1. USERS (extends Supabase auth.users)
-- ─────────────────────────────────────────
CREATE TABLE public.users (
  id                     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                  TEXT NOT NULL,
  full_name              TEXT NOT NULL,
  role                   TEXT NOT NULL CHECK (role IN ('manager', 'board', 'driver')),
  avatar_url             TEXT,
  force_password_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-insert user row on signup (managers create users via admin, so this is a safety net)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'driver')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────
-- 2. VEHICLES
-- ─────────────────────────────────────────
CREATE TABLE public.vehicles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand           TEXT NOT NULL,
  model           TEXT NOT NULL,
  plate_no        TEXT NOT NULL UNIQUE,
  soc             INTEGER NOT NULL DEFAULT 100 CHECK (soc BETWEEN 0 AND 100),
  soh             INTEGER NOT NULL DEFAULT 100 CHECK (soh BETWEEN 0 AND 100),
  status          TEXT NOT NULL DEFAULT 'Parked' CHECK (status IN ('Moving', 'Parked', 'Charging', 'Maintenance')),
  location_name   TEXT,
  location_detail TEXT,
  coordinates     TEXT,
  odometer        INTEGER NOT NULL DEFAULT 0,
  year            INTEGER,
  color           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 3. DRIVERS
-- ─────────────────────────────────────────
CREATE TABLE public.drivers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  license_no          TEXT,
  phone               TEXT,
  joined_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ─────────────────────────────────────────
-- 4. TRIPS
-- ─────────────────────────────────────────
CREATE TABLE public.trips (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id   UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id    UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  origin       TEXT NOT NULL,
  destination  TEXT NOT NULL,
  distance_km  NUMERIC(8,2) DEFAULT 0,
  energy_kwh   NUMERIC(8,2) DEFAULT 0,
  duration_min INTEGER DEFAULT 0,
  avg_speed    NUMERIC(5,1) DEFAULT 0,
  started_at   TIMESTAMPTZ NOT NULL,
  ended_at     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 5. ALERTS
-- ─────────────────────────────────────────
CREATE TABLE public.alerts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id  UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('low_battery', 'maintenance', 'charge_complete', 'geofence', 'speeding')),
  message     TEXT NOT NULL,
  resolved    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 6. CHARGING STATIONS
-- ─────────────────────────────────────────
CREATE TABLE public.charging_stations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  address        TEXT,
  coordinates    TEXT,
  connector_type TEXT DEFAULT 'CCS2',
  power_kw       NUMERIC(6,1) DEFAULT 22.0,
  is_active      BOOLEAN DEFAULT TRUE,
  installed_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 7. USER PREFERENCES
-- ─────────────────────────────────────────
CREATE TABLE public.user_preferences (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  theme    TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark'))
);

-- ══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ══════════════════════════════════════════════════════

ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charging_stations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences   ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: get current driver's assigned vehicle
CREATE OR REPLACE FUNCTION public.get_my_vehicle_id()
RETURNS UUID AS $$
  SELECT assigned_vehicle_id FROM public.drivers WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── USERS ──
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (id = auth.uid() OR get_my_role() IN ('manager', 'board'));
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "users_insert_manager" ON public.users FOR INSERT WITH CHECK (get_my_role() = 'manager');
CREATE POLICY "users_delete_manager" ON public.users FOR DELETE USING (get_my_role() = 'manager');

-- ── VEHICLES ──
CREATE POLICY "vehicles_select_all_auth" ON public.vehicles FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    get_my_role() IN ('manager', 'board') OR
    id = get_my_vehicle_id()
  )
);
CREATE POLICY "vehicles_insert_manager" ON public.vehicles FOR INSERT WITH CHECK (get_my_role() = 'manager');
CREATE POLICY "vehicles_update_manager" ON public.vehicles FOR UPDATE USING (get_my_role() = 'manager');
CREATE POLICY "vehicles_delete_manager" ON public.vehicles FOR DELETE USING (get_my_role() = 'manager');

-- ── DRIVERS ──
CREATE POLICY "drivers_select" ON public.drivers FOR SELECT USING (
  get_my_role() IN ('manager', 'board') OR user_id = auth.uid()
);
CREATE POLICY "drivers_insert_manager" ON public.drivers FOR INSERT WITH CHECK (get_my_role() = 'manager');
CREATE POLICY "drivers_update_manager" ON public.drivers FOR UPDATE USING (get_my_role() = 'manager');
CREATE POLICY "drivers_delete_manager" ON public.drivers FOR DELETE USING (get_my_role() = 'manager');

-- ── TRIPS ──
CREATE POLICY "trips_select" ON public.trips FOR SELECT USING (
  get_my_role() IN ('manager', 'board') OR
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);
CREATE POLICY "trips_insert_manager" ON public.trips FOR INSERT WITH CHECK (get_my_role() = 'manager');
CREATE POLICY "trips_update_manager" ON public.trips FOR UPDATE USING (get_my_role() = 'manager');
CREATE POLICY "trips_delete_manager" ON public.trips FOR DELETE USING (get_my_role() = 'manager');

-- ── ALERTS ──
CREATE POLICY "alerts_select" ON public.alerts FOR SELECT USING (
  get_my_role() IN ('manager', 'board') OR
  vehicle_id = get_my_vehicle_id()
);
CREATE POLICY "alerts_manage_manager" ON public.alerts FOR ALL USING (get_my_role() = 'manager');

-- ── CHARGING STATIONS ──
CREATE POLICY "stations_select_all_auth" ON public.charging_stations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "stations_manage_manager" ON public.charging_stations FOR ALL USING (get_my_role() = 'manager');

-- ── USER PREFERENCES ──
CREATE POLICY "prefs_own" ON public.user_preferences FOR ALL USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════
-- SAMPLE SEED DATA (5 vehicles — your actual fleet)
-- Uncomment and customize before running
-- ══════════════════════════════════════════════════════

/*
INSERT INTO public.vehicles (brand, model, plate_no, soc, soh, status, location_name, location_detail, coordinates, odometer, year) VALUES
('BYD',   'Atto 3',     'B 1234 EV', 82, 96, 'Moving', 'Sudirman, Jakarta Pusat',   'Jl. Jend. Sudirman No.52', '-6.2088, 106.8175', 6240, 2024),
('BYD',   'Han EV',     'B 5678 EV', 67, 94, 'Parked', 'Kemang, Jakarta Selatan',   'Jl. Kemang Raya No.14',    '-6.2600, 106.8150', 5100, 2024),
('AION',  'AION S Plus','B 9012 EV', 55, 88, 'Moving', 'Tebet, Jakarta Selatan',    'Jl. Dr. Saharjo No.107',   '-6.2376, 106.8499', 7120, 2023),
('JAC',   'iEV7S',      'B 3456 EV', 91, 85, 'Moving', 'Cawang, Jakarta Timur',     'Jl. MT Haryono No.9',      '-6.2431, 106.8651', 5210, 2023),
('Foton', 'MIDI EV',    'B 7890 EV', 100,97, 'Parked', 'Tanjung Priok, Jak. Utara', 'Jl. Yos Sudarso No.88',    '-6.1073, 106.8690', 3890, 2024);
*/
