
-- Phase 2: Core Logic Schema

-- 1. daily_records table
-- Stores daily report data with flexible JSONB structure
create table if not exists daily_records (
  id uuid default gen_random_uuid() primary key,
  facility_id uuid references facilities(id) not null,
  resident_id uuid references residents(id) not null,
  date date not null,
  
  -- Core flags for logic calculation
  hospitalization_status boolean default false,
  overnight_stay_status boolean default false,
  
  -- Flexible data storage (vitals, meals, excretion, etc.)
  data jsonb default '{}'::jsonb,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(resident_id, date)
);

-- Indices for performance
create index if not exists idx_daily_records_facility_date on daily_records(facility_id, date);
create index if not exists idx_daily_records_resident_date on daily_records(resident_id, date);

-- 2. hq_hospitalization_periods table
-- Stores calculated periods for HQ reporting (result of "wash-replace" logic)
create table if not exists hq_hospitalization_periods (
  id uuid default gen_random_uuid() primary key,
  facility_id uuid references facilities(id) not null,
  resident_id uuid references residents(id) not null,
  
  -- 'hospitalization' or 'overnight_stay'
  period_type text not null,
  
  start_date date,
  end_date date,
  
  -- The month this calculation belongs to (e.g. 2024-04-01)
  target_month date not null,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure easy cleanup for wash-replace strategy
create index if not exists idx_hq_periods_target on hq_hospitalization_periods (facility_id, target_month);

-- 3. finding_comments table (Killer Feature: Context Chat)
create table if not exists finding_comments (
  id uuid default gen_random_uuid() primary key,
  daily_record_id uuid references daily_records(id) on delete cascade not null,
  
  -- Identifies the specific cell/field (e.g., "meal_breakfast" or "vitals.temp")
  json_path text not null,
  
  comment text not null,
  author_id uuid references staffs(id),
  author_name text not null,
  
  is_resolved boolean default false,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_finding_comments_record on finding_comments(daily_record_id);

-- RLS Policies (Simplified)
alter table daily_records enable row level security;
alter table hq_hospitalization_periods enable row level security;
alter table finding_comments enable row level security;

create policy "Enable all for authenticated users" on daily_records for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated users" on hq_hospitalization_periods for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated users" on finding_comments for all using (auth.role() = 'authenticated');
