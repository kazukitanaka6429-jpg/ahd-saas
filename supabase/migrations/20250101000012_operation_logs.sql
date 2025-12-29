-- Phase 3.3: HQ Operation Logs

create table if not exists operation_logs (
  id uuid default gen_random_uuid() primary key,
  staff_id uuid references staffs(id) not null,
  
  target_date date not null,
  target_resident_id uuid references residents(id) not null,
  
  action_type text not null, -- 'update', 'delete', etc.
  
  details jsonb default '{}'::jsonb, -- Store details about what changed
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for timeline queries
create index if not exists idx_operation_logs_timeline on operation_logs(target_date, target_resident_id);
create index if not exists idx_operation_logs_staff on operation_logs(staff_id);

alter table operation_logs enable row level security;
create policy "Enable all for authenticated users" on operation_logs for all using (auth.role() = 'authenticated');
