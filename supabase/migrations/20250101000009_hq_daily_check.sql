-- Phase 3: HQ Daily Check Schema

-- external_billing_imports table
-- Stores billing data imported from external CSV (e.g., Honobono) for comparison
create table if not exists external_billing_imports (
  id uuid default gen_random_uuid() primary key,
  facility_id uuid references facilities(id) not null,
  
  -- The month this data belongs to (e.g. 2024-04-01)
  -- Data is typically imported monthly.
  target_month date not null,
  
  -- Extracted from CSV
  resident_name text not null,
  item_name text not null,   -- e.g. "朝食", "昼食", "日中活動"
  quantity integer default 0,
  amount integer default 0,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Determine uniqueness to simplify "wash-replace" or upsert logic
  -- If we re-import the same file, we should match these keys.
  unique(facility_id, target_month, resident_name, item_name)
);

-- Index for querying by month and facility (common access pattern)
create index if not exists idx_external_billing_imports_target on external_billing_imports(facility_id, target_month);

-- RLS Policies
alter table external_billing_imports enable row level security;

create policy "Enable all for authenticated users" on external_billing_imports for all using (auth.role() = 'authenticated');
