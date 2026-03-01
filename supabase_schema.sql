-- ============================================================
-- IDRMS Database Schema v2 — Barangay Kauswagan, CDO
-- Instructions: Supabase Dashboard → SQL Editor → New Query
--               Paste entire file → Run
-- ============================================================

-- Drop existing tables (clean slate)
drop table if exists public.activity_log cascade;
drop table if exists public.resources cascade;
drop table if exists public.residents cascade;
drop table if exists public.evac_centers cascade;
drop table if exists public.alerts cascade;
drop table if exists public.incidents cascade;
drop table if exists public.users cascade;

-- USERS table
create table public.users (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text unique not null,
  password   text not null,
  role       text not null default 'Staff' check (role in ('Admin','Staff')),
  status     text not null default 'Active' check (status in ('Active','Inactive')),
  last_login timestamptz,
  created_at timestamptz default now()
);

-- INCIDENTS table
create table public.incidents (
  id            uuid primary key default gen_random_uuid(),
  type          text not null,
  zone          text not null,
  location      text default '',
  severity      text not null default 'Medium' check (severity in ('Low','Medium','High')),
  status        text not null default 'Pending' check (status in ('Active','Pending','Verified','Responded','Resolved')),
  description   text default '',
  reporter      text default '',
  source        text default 'web',
  lat           double precision,
  lng           double precision,
  date_reported timestamptz default now(),
  created_at    timestamptz default now()
);

-- ALERTS table
create table public.alerts (
  id               uuid primary key default gen_random_uuid(),
  title            text not null default '',
  message          text not null,
  level            text not null default 'Advisory' check (level in ('Advisory','Warning','Danger','Resolved')),
  zone             text not null default 'All Zones',
  channel          text default 'Web',
  sent_by          text default 'Admin',
  recipients_count int default 0,
  sent_at          timestamptz default now(),
  created_at       timestamptz default now()
);

-- EVACUATION CENTERS table
create table public.evac_centers (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  zone                 text not null,
  address              text default '',
  capacity             int not null default 0,
  occupancy            int not null default 0,
  status               text not null default 'Open' check (status in ('Open','Full','Closed')),
  facilities_available text[] default '{}',
  contact_person       text default '',
  contact              text default '',
  lat                  double precision,
  lng                  double precision,
  created_at           timestamptz default now()
);

-- RESIDENTS table
create table public.residents (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  zone               text not null,
  address            text default '',
  household_members  int default 1,
  contact            text default '',
  evacuation_status  text default 'Safe' check (evacuation_status in ('Safe','Evacuated','Unaccounted')),
  vulnerability_tags text[] default '{}',
  lat                double precision,
  lng                double precision,
  notes              text default '',
  added_by           text default 'Admin',
  source             text default 'web',
  added_at           timestamptz default now(),
  updated_at         timestamptz default now()
);

-- RESOURCES table
create table public.resources (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  category   text not null,
  quantity   int not null default 0,
  available  int not null default 0,
  unit       text default 'pcs',
  location   text default '',
  status     text default 'Available',
  notes      text default '',
  created_at timestamptz default now()
);

-- ACTIVITY LOG table
create table public.activity_log (
  id         uuid primary key default gen_random_uuid(),
  action     text not null,
  type       text not null,
  user_name  text default 'System',
  urgent     boolean default false,
  created_at timestamptz default now()
);

-- ── INDEXES ────────────────────────────────────────────────
create index if not exists idx_incidents_zone on public.incidents(zone);
create index if not exists idx_residents_zone on public.residents(zone);
create index if not exists idx_activity_log_created on public.activity_log(created_at desc);

-- ── ROW LEVEL SECURITY ─────────────────────────────────────
alter table public.users        enable row level security;
alter table public.incidents    enable row level security;
alter table public.alerts       enable row level security;
alter table public.evac_centers enable row level security;
alter table public.residents    enable row level security;
alter table public.resources    enable row level security;
alter table public.activity_log enable row level security;

-- Allow all operations for anon key (app handles auth itself)
create policy "public_all_users"        on public.users        for all using (true) with check (true);
create policy "public_all_incidents"    on public.incidents    for all using (true) with check (true);
create policy "public_all_alerts"       on public.alerts       for all using (true) with check (true);
create policy "public_all_evac_centers" on public.evac_centers for all using (true) with check (true);
create policy "public_all_residents"    on public.residents    for all using (true) with check (true);
create policy "public_all_resources"    on public.resources    for all using (true) with check (true);
create policy "public_all_activity_log" on public.activity_log for all using (true) with check (true);

-- ── SEED DATA ──────────────────────────────────────────────
insert into public.users (name, email, password, role, status) values
  ('Admin User',  'admin@kauswagan.gov.ph', 'admin123', 'Admin', 'Active'),
  ('Staff User',  'staff@kauswagan.gov.ph', 'admin123', 'Staff', 'Active'),
  ('Juan Dela Cruz', 'juan@kauswagan.gov.ph', 'staff123', 'Staff', 'Active')
on conflict (email) do nothing;

insert into public.evac_centers (name, zone, address, capacity, occupancy, status, facilities_available, contact_person, contact, lat, lng) values
  ('Kauswagan Elementary School', 'Zone 1', 'Purok 1, Brgy. Kauswagan, CDO', 300, 0, 'Open', ARRAY['Water','Restroom','Medical','Power','Food'], 'Maria Santos', '09171234567', 8.4945, 124.6415),
  ('Covered Court Tamparong',     'Zone 2', 'Tamparong St., Brgy. Kauswagan', 200, 45, 'Open', ARRAY['Water','Restroom','Power'], 'Pedro Reyes', '09181234567', 8.4932, 124.6462),
  ('Barangay Hall Kauswagan',     'Zone 3', 'Kauswagan Main Road, CDO', 150, 0, 'Open', ARRAY['Water','Restroom','Medical','Power','Food','Sleeping Area'], 'Ana Lim', '09191234567', 8.4922, 124.6498),
  ('Zone 5 Community Center',     'Zone 5', 'Purok 5, Brgy. Kauswagan', 120, 0, 'Open', ARRAY['Water','Restroom'], 'Jose Tan', '09201234567', 8.4872, 124.6448)
on conflict do nothing;

insert into public.incidents (type, zone, location, severity, status, description, reporter, source) values
  ('Flood', 'Zone 3', 'Near Cagayan River embankment', 'High', 'Active', 'Rising water level detected. Residents warned to evacuate.', 'Kagawad Torres', 'web'),
  ('Fire', 'Zone 1', 'Purok 2, beside sari-sari store', 'Medium', 'Pending', 'Small fire reported, fire truck dispatched.', 'Tanod Flores', 'web'),
  ('Storm', 'Zone 2', 'Open areas near Tamparong', 'Low', 'Verified', 'Tropical depression causing strong winds.', 'PAGASA Advisory', 'web')
on conflict do nothing;

insert into public.resources (name, category, quantity, available, unit, location, status) values
  ('Life Jackets',        'Safety Gear',  50, 45, 'pcs', 'Barangay Hall Bodega',  'Available'),
  ('Emergency Food Packs','Food Supply',  200, 180, 'packs', 'Hall Storage Room', 'Available'),
  ('First Aid Kits',      'Medical',      30, 28, 'kits', 'Health Center',        'Available'),
  ('Rescue Boats',        'Equipment',    3, 2, 'units', 'Riverside Depot',       'Partially Deployed'),
  ('Flashlights',         'Equipment',    80, 70, 'pcs', 'Hall Storage Room',     'Available'),
  ('Raincoats',           'Safety Gear',  100, 95, 'pcs', 'Barangay Hall Bodega', 'Available')
on conflict do nothing;

insert into public.activity_log (action, type, user_name, urgent) values
  ('System initialized — IDRMS v2.0 ready', 'System', 'System', false),
  ('Flood incident reported in Zone 3', 'Incident', 'Kagawad Torres', true),
  ('Evacuation center Barangay Hall status checked', 'Evacuation', 'Admin User', false)
on conflict do nothing;

select 'IDRMS v2 schema created successfully! 7 tables with seed data ready.' as result;
