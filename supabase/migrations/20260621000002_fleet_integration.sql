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

-- 3b. Preflight: abort if any unrecognised status value exists (prevents silent bad-data migration)
do $$
begin
  if exists (
    select 1 from public.vehicles
    where status not in ('Moving','Parked','Charging','Maintenance',
                         'IDLE','DISPATCHED','PATROLLING','ROUTING_TO_CHARGER','CHARGING','OFFLINE')
  ) then
    raise exception 'vehicles.status contains unrecognised values; migration aborted. '
                    'Fix the data before re-running.';
  end if;
end $$;

-- 3c. Migrate existing status values to dispatch statuses
update public.vehicles set status = 'PATROLLING'        where status = 'Moving';
update public.vehicles set status = 'IDLE'              where status = 'Parked';
update public.vehicles set status = 'CHARGING'          where status = 'Charging';
update public.vehicles set status = 'OFFLINE'           where status = 'Maintenance';

-- 3d. Add new status constraint (idempotent — safe to re-run).
-- Postgres has no ADD CONSTRAINT IF NOT EXISTS, so drop-then-add inside a DO block.
do $$ begin
  alter table public.vehicles drop constraint if exists vehicles_status_check;
  alter table public.vehicles
    add constraint vehicles_status_check
    check (status in ('IDLE','DISPATCHED','PATROLLING','ROUTING_TO_CHARGER','CHARGING','OFFLINE'));
end $$;

-- 3e. Add dispatch columns
alter table public.vehicles
  add column if not exists current_shift_id    uuid null,
  add column if not exists assigned_charger_id uuid null
    references public.charging_stations(id) on delete set null;

-- 3f. Add FK from vehicles.current_shift_id → shifts (idempotent — safe to re-run).
do $$ begin
  alter table public.vehicles drop constraint if exists vehicles_current_shift_id_fkey;
  alter table public.vehicles
    add constraint vehicles_current_shift_id_fkey
    foreign key (current_shift_id) references public.shifts(id) on delete set null;
end $$;

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
