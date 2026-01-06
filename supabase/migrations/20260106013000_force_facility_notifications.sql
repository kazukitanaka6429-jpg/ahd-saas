-- Re-applying facility_notifications table creation
-- Original migration likely skipped or failed silently

create table if not exists facility_notifications (
  id uuid default gen_random_uuid() primary key,
  facility_id uuid references facilities(id) not null,
  created_by uuid references staffs(id),
  
  content text not null,
  priority text default 'normal' check (priority in ('high', 'normal', 'low')),
  status text default 'open' check (status in ('open', 'resolved')),
  
  created_at timestamp with time zone default now(),
  resolved_at timestamp with time zone,
  resolved_by uuid references staffs(id)
);

-- RLS Policies
alter table facility_notifications enable row level security;

-- Drop existing policies to avoid conflict if partially applied
drop policy if exists "Enable read access for authenticated users" on facility_notifications;
drop policy if exists "Enable insert access for authenticated users" on facility_notifications;
drop policy if exists "Enable update access for authenticated users" on facility_notifications;

create policy "Enable read access for authenticated users"
on facility_notifications for select
to authenticated
using (true);

create policy "Enable insert access for authenticated users"
on facility_notifications for insert
to authenticated
with check (true);

create policy "Enable update access for authenticated users"
on facility_notifications for update
to authenticated
using (true);
