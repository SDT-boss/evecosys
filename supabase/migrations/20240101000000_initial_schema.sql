-- Initial schema — baseline for Supabase CLI migration tracking.
-- This schema was previously applied manually via the Supabase SQL Editor.
-- Mark as applied on existing projects: supabase migration repair --status applied 20240101000000
-- Run fresh on new projects: supabase db push

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- 1. USERS (extends Supabase auth.users)
-- ─────────────────────────────────────────
CREATE TABLE public.users (
  id                     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                  TEXT NOT NULL,
  google_id              TEXT,
  full_name              TEXT NOT NULL,
  role                   TEXT NOT NULL CHECK (role IN ('manager', 'board', 'driver')),
  avatar_url             TEXT,
  force_password_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  existing_id UUID;
  provider_id TEXT;
BEGIN
  provider_id := COALESCE(NEW.raw_user_meta_data->>'sub', NEW.raw_user_meta_data->>'provider_id', NULL);

  SELECT id INTO existing_id FROM public.users WHERE email = NEW.email LIMIT 1;

  IF FOUND THEN
    UPDATE public.drivers SET user_id = NEW.id WHERE user_id = existing_id;

    UPDATE public.users
    SET id = NEW.id,
        google_id = COALESCE(provider_id, google_id),
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
        role = COALESCE(NEW.raw_user_meta_data->>'role', role),
        avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url)
    WHERE id = existing_id;

    RETURN NEW;
  ELSE
    INSERT INTO public.users (id, email, google_id, full_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      provider_id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
      COALESCE(NEW.raw_user_meta_data->>'role', 'driver')
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
  END IF;
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
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════

ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charging_stations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences   ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_my_vehicle_id()
RETURNS UUID AS $$
  SELECT assigned_vehicle_id FROM public.drivers WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- USERS
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (id = auth.uid() OR get_my_role() IN ('manager', 'board'));
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "users_insert_manager" ON public.users FOR INSERT WITH CHECK (get_my_role() = 'manager');
CREATE POLICY "users_delete_manager" ON public.users FOR DELETE USING (get_my_role() = 'manager');

-- VEHICLES
CREATE POLICY "vehicles_select_all_auth" ON public.vehicles FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    get_my_role() IN ('manager', 'board') OR
    id = get_my_vehicle_id()
  )
);
CREATE POLICY "vehicles_insert_manager" ON public.vehicles FOR INSERT WITH CHECK (get_my_role() = 'manager');
CREATE POLICY "vehicles_update_manager" ON public.vehicles FOR UPDATE USING (get_my_role() = 'manager');
CREATE POLICY "vehicles_delete_manager" ON public.vehicles FOR DELETE USING (get_my_role() = 'manager');

-- DRIVERS
CREATE POLICY "drivers_select" ON public.drivers FOR SELECT USING (
  get_my_role() IN ('manager', 'board') OR user_id = auth.uid()
);
CREATE POLICY "drivers_insert_manager" ON public.drivers FOR INSERT WITH CHECK (get_my_role() = 'manager');
CREATE POLICY "drivers_update_manager" ON public.drivers FOR UPDATE USING (get_my_role() = 'manager');
CREATE POLICY "drivers_delete_manager" ON public.drivers FOR DELETE USING (get_my_role() = 'manager');

-- TRIPS
CREATE POLICY "trips_select" ON public.trips FOR SELECT USING (
  get_my_role() IN ('manager', 'board') OR
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);
CREATE POLICY "trips_insert_manager" ON public.trips FOR INSERT WITH CHECK (get_my_role() = 'manager');
CREATE POLICY "trips_update_manager" ON public.trips FOR UPDATE USING (get_my_role() = 'manager');
CREATE POLICY "trips_delete_manager" ON public.trips FOR DELETE USING (get_my_role() = 'manager');

-- ALERTS
CREATE POLICY "alerts_select" ON public.alerts FOR SELECT USING (
  get_my_role() IN ('manager', 'board') OR
  vehicle_id = get_my_vehicle_id()
);
CREATE POLICY "alerts_manage_manager" ON public.alerts FOR ALL USING (get_my_role() = 'manager');

-- CHARGING STATIONS
CREATE POLICY "stations_select_all_auth" ON public.charging_stations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "stations_manage_manager" ON public.charging_stations FOR ALL USING (get_my_role() = 'manager');

-- USER PREFERENCES
CREATE POLICY "prefs_own" ON public.user_preferences FOR ALL USING (user_id = auth.uid());
